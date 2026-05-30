# ORCA_V16 — Project Context Graph

> A comprehensive structural and functional map of the ORCA_V16 codebase, designed to serve as context for AI-assisted PRD generation and further development.

---

## 1. PROJECT OVERVIEW

**ORCA_V16** is a full-stack financial terminal/dashboard application branded as "ORCA Alpha Terminal." It aggregates, scrapes, and visualizes real-time financial market data from multiple global and Indian market sources. The application combines:

- **Web scraping** (Cheerio, Playwright) from financial news/data sites
- **Real-time data feeds** (SSE for live earnings)
- **AI-powered analysis** (Google Gemini API)
- **Persistent JSON-based data storage** (file-system database)
- **A rich single-page React frontend** with a dark, glassmorphism-styled "hacker terminal" aesthetic

The application runs as a single Node.js process serving both the Express API backend and the Vite-powered React frontend.

---

## 2. ARCHITECTURE DIAGRAM (TEXTUAL)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCA_V16 Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (React)                       │   │
│  │  src/main.tsx → src/App.tsx → src/components/*           │   │
│  │  - 14 Tab-based views (Dashboard, News, ETFs, etc.)      │   │
│  │  - Fetch data via REST API calls to /api/*               │   │
│  │  - SSE connection for live earnings streaming             │   │
│  │  - TailwindCSS + Custom glassmorphism CSS                │   │
│  │  - Charts via Recharts library                            │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │ HTTP (fetch) + SSE (EventSource)      │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  BACKEND (Express.js)                     │   │
│  │  server.ts — Main Express server (port 3000)             │   │
│  │  - 35+ REST API endpoints (/api/*)                       │   │
│  │  - SSE endpoint for live earnings streaming              │   │
│  │  - Vite dev middleware (dev mode) or static serving      │   │
│  │  - JSON file-based persistence (data/ directory)         │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │ Import/Call                            │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SCRAPER MODULES (14 files)                   │   │
│  │                                                          │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │ server-scraper.ts   │  │ server-global-scraper.ts  │  │   │
│  │  │ Zerodha Pulse +     │  │ Bloomberg + Reuters +     │  │   │
│  │  │ Finology Ticker     │  │ WorldMonitor RSS feeds    │  │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │ server-etf-scraper  │  │ server-indian-indices-    │  │   │
│  │  │ 14 IndMoney ETF     │  │ scraper.ts               │  │   │
│  │  │ categories          │  │ NSE India indices data    │  │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │ server-fii-dii-     │  │ server-nse500-scraper.ts  │  │   │
│  │  │ scraper.ts          │  │ NSE 500 stocks + quotes   │  │   │
│  │  │ StockEdge FII/DII   │  │                          │  │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │ server-nse.ts       │  │ server-bse.ts             │  │   │
│  │  │ NSE India full data │  │ BSE India full data       │  │   │
│  │  │ (Playwright-based)  │  │ (Playwright-based)        │  │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │ server-earnings-    │  │ server-live-earnings-     │  │   │
│  │  │ scraper.ts          │  │ scraper.ts                │  │   │
│  │  │ MoneyControl        │  │ Basic HTML-based live     │  │   │
│  │  │ earnings calendar   │  │ earnings scraper          │  │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │ server-live-        │  │ server-moneycontrol-      │  │   │
│  │  │ earnings-playwright │  │ earnings.ts               │  │   │
│  │  │ Enhanced Playwright │  │ MC earnings (Playwright)  │  │   │
│  │  │ live earnings       │  │                           │  │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐  │   │
│  │  │ server-moneycontrol │  │ server-alpha-vantage.ts   │  │   │
│  │  │ -world.ts           │  │ Alpha Vantage global      │  │   │
│  │  │ MC World news       │  │ indices API               │  │   │
│  │  │ (Playwright)        │  │                           │  │   │
│  │  └─────────────────────┘  └──────────────────────────┘  │   │
│  │  ┌─────────────────────┐                                 │   │
│  │  │ server-indstocks-   │                                 │   │
│  │  │ scraper.ts          │                                 │   │
│  │  │ IndStocks live news │                                 │   │
│  │  │ (Playwright)        │                                 │   │
│  │  └─────────────────────┘                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EXTERNAL DATA SOURCES                        │   │
│  │                                                          │   │
│  │  News:       Zerodha Pulse, Finology Ticker,             │   │
│  │              MoneyControl, Bloomberg, Reuters,            │   │
│  │              Yahoo Finance, SeekingAlpha, Google News RSS │   │
│  │  Indices:    NSE India, BSE India, Alpha Vantage API     │   │
│  │  ETFs:       IndMoney (14 categories)                    │   │
│  │  FII/DII:    StockEdge                                   │   │
│  │  Earnings:   MoneyControl, Tickertape API, IndStocks     │   │
│  │  Conflict:   GNews API (user-provided key)               │   │
│  │  AI:         Google Gemini API (user-provided key)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PERSISTENCE LAYER                            │   │
│  │  data/ directory (JSON files)                             │   │
│  │  - data-signals.json    - data-news.json                  │   │
│  │  - data-models.json     - data-pipeline.json              │   │
│  │  - data-etfs.json       - data-global-monitor.json        │   │
│  │  - data-indian-indices.json  - data-fii-dii.json          │   │
│  │  - data-nse500.json     - data-earnings.json              │   │
│  │  - data-nse.json        - data-bse.json                   │   │
│  │  - data-moneycontrol-earnings.json                        │   │
│  │  - data-moneycontrol-world.json                           │   │
│  │  - data-indstocks-live.json                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. TECHNOLOGY STACK

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite 6 | Build tool & dev server |
| TailwindCSS 4 | Utility-first CSS via `@tailwindcss/vite` plugin |
| Recharts | Data visualization (area charts for NSE 500) |
| Lucide React | Icon library |
| Material Symbols | Google icon font (terminal aesthetic) |
| Framer Motion (`motion`) | Animations |
| Custom CSS | Glassmorphism, scanline effects, orbital hover effects |

### Backend
| Technology | Purpose |
|---|---|
| Express.js | HTTP server & REST API |
| Node.js | Runtime |
| tsx | TypeScript execution (dev mode) |
| esbuild | Production bundling |

### Scraping & Data
| Technology | Purpose |
|---|---|
| Cheerio | HTML parsing for web scraping (most scrapers) |
| Playwright | Browser automation for JS-heavy sites (NSE, BSE, MC World, MC Earnings, Live Earnings, IndStocks) |
| nse-bse-api | NSE/BSE data helper library |
| node-fetch (built-in) | HTTP requests to external APIs |

### AI Integration
| Technology | Purpose |
|---|---|
| @google/genai | Google Gemini API client (gemini-3.5-flash model) |

### Data Storage
| Technology | Purpose |
|---|---|
| JSON files on disk | Simple file-based persistence in `data/` directory |

---

## 4. FILE STRUCTURE

```
ORCA_V16/
├── index.html                          # SPA entry point
├── vite.config.ts                      # Vite config with TailwindCSS + React plugins
├── package.json                        # Dependencies and scripts
├── README.md                           # Basic run instructions
│
├── src/                                # FRONTEND SOURCE
│   ├── main.tsx                        # React root mount
│   ├── App.tsx                         # Main application (~4457 lines, monolithic)
│   │                                   #   - All 14 tab views rendered inline
│   │                                   #   - All state management
│   │                                   #   - All API fetch functions
│   │                                   #   - All event handlers
│   ├── index.css                       # Global styles, glassmorphism, effects
│   ├── types.ts                        # TypeScript interfaces (388 lines)
│   └── components/
│       ├── Nse500Tracker.tsx           # NSE 500 stock tracker component (779 lines)
│       │                               #   - Filtering, sorting, pagination
│       │                               #   - Recharts area chart
│       │                               #   - Detailed quote modal
│       └── LiveEarningsFeed.tsx        # Live earnings SSE component (492 lines)
│                                       #   - Server-Sent Events connection
│                                       #   - Auto-reconnect logic
│                                       #   - Priority & type filtering
│
├── server.ts                           # MAIN BACKEND SERVER (1533 lines)
│                                       #   - Express app setup
│                                       #   - 35+ REST API endpoints
│                                       #   - SSE streaming endpoint
│                                       #   - JSON file persistence
│                                       #   - Default data seeding
│                                       #   - Gemini AI integration
│                                       #   - Vite dev middleware
│
├── server-scraper.ts                   # News scraper (Zerodha + Finology)
├── server-global-scraper.ts            # Global news (Bloomberg + Reuters + WorldMonitor RSS)
├── server-etf-scraper.ts              # ETF data from IndMoney (14 categories)
├── server-indian-indices-scraper.ts   # Indian market indices from NSE
├── server-fii-dii-scraper.ts          # FII/DII activity from StockEdge
├── server-nse500-scraper.ts           # NSE 500 stocks list + individual quotes
├── server-nse.ts                       # Full NSE India data (Playwright-based)
├── server-bse.ts                       # Full BSE India data (Playwright-based)
├── server-earnings-scraper.ts         # Earnings calendar from MoneyControl
├── server-live-earnings-scraper.ts    # Live earnings calls (basic HTML scraper)
├── server-live-earnings-playwright.ts # Live earnings calls (enhanced Playwright)
├── server-moneycontrol-earnings.ts    # MoneyControl earnings (Playwright)
├── server-moneycontrol-world.ts       # MoneyControl World news (Playwright)
├── server-alpha-vantage.ts            # Alpha Vantage global indices API
├── server-indstocks-scraper.ts        # IndStocks live news (Playwright)
│
├── data/                               # PERSISTENT JSON DATABASE (auto-created)
│   ├── data-signals.json
│   ├── data-news.json
│   ├── data-models.json
│   ├── data-pipeline.json
│   ├── data-etfs.json
│   ├── data-global-monitor.json
│   ├── data-indian-indices.json
│   ├── data-fii-dii.json
│   ├── data-nse500.json
│   ├── data-earnings.json
│   ├── data-nse.json
│   ├── data-bse.json
│   ├── data-moneycontrol-earnings.json
│   ├── data-moneycontrol-world.json
│   └── data-indstocks-live.json
│
├── scratch/                            # Scratch/work directory
└── shims/node-domexception/            # Node.js compatibility shim
```

---

## 5. APPLICATION ENTRY POINTS & BUILD PIPELINE

### Scripts
```json
{
  "dev": "tsx server.ts",           // Development mode (ts-node style execution)
  "build": "vite build && esbuild server.ts --bundle --platform=node ...",
  "start": "node dist/server.cjs"  // Production mode
}
```

### Server Boot Sequence (`server.ts`)
1. Creates Express app on port 3000
2. Ensures `data/` directory exists
3. In **dev mode**: Creates Vite server in middleware mode, attaches to Express
4. In **production**: Serves static `dist/` files with SPA fallback
5. Loads/initializes all JSON databases with default data on first run
6. Listens on `0.0.0.0:3000`

### Frontend Boot Sequence
1. `index.html` loads `src/main.tsx`
2. `main.tsx` renders `<App />` inside `<StrictMode>`
3. `App.tsx` executes 15 parallel `fetch()` calls on mount to load all data modules
4. Active tab defaults to `"dashboard"`

---

## 6. FRONTEND ARCHITECTURE

### Monolithic App Component (`src/App.tsx` — 4457 lines)
The entire frontend is structured as a single large React component with:
- **70+ useState hooks** managing all application state
- **15+ useEffect hooks** for data fetching, timers, and side effects
- **25+ async fetch functions** calling backend APIs
- **14 tab views** rendered conditionally based on `activeTab` state

### Tab Navigation (14 Views)

| Tab ID | Name | Description |
|---|---|---|
| `dashboard` | Dashboard | Trading signals, ticker cards, recalibration filters, index exposure |
| `indian-indices` | Indian Indices | Live NIFTY indices data with search and scrape |
| `nse-500-tracker` | NSE 500 Tracker | Full NSE 500 stock list with filtering, sorting, charts |
| `fii-dii` | Institutional Investment Flow | FII/DII activity data from StockEdge |
| `news` | News Feed | Scraped news from Zerodha/Finology/MC, Gemini AI analysis |
| `pipeline` | Pipeline | Simulated ML pipeline execution phases + live log stream |
| `etfs` | Global ETFs | ETF monitoring (default + 14 scraped categories), AI analysis |
| `global-monitor` | Global Monitor | Bloomberg/Reuters/WorldMonitor feeds, Alpha Vantage indices |
| `earnings` | Earnings Calendar | MoneyControl earnings data, live earnings SSE feed |
| `models` | Models | AI model configuration, prompt optimization via Gemini |
| `conflict-tracker` | Conflict Tracker | GNews API-powered conflict/geopolitical news search |
| `settings` | Settings | API key management (GNews, Alpha Vantage, Gemini) |
| `terminal` | Terminal | Placeholder terminal view |

### Sub-navigation within tabs
- **Global Monitor** has sub-tabs: `worldmonitor` and `macro`
- **ETFs** has view modes: `monitored` and `scraped` (with category selector)
- **News** has source filter: `all`, `zerodha`, `finology`

### Extracted Components
| Component | File | Purpose |
|---|---|---|
| `Nse500Tracker` | `src/components/Nse500Tracker.tsx` | Standalone NSE 500 data table with filtering, sorting, pagination, chart visualization, and detailed quote modal |
| `LiveEarningsFeed` | `src/components/LiveEarningsFeed.tsx` | Real-time SSE-powered earnings feed with auto-reconnect, priority filtering, and type filtering |

---

## 7. BACKEND API ENDPOINTS

### Core Data Endpoints (GET — read cached data)
| Endpoint | Description | Data File |
|---|---|---|
| `GET /api/signals` | Trading signals + tickers | `data-signals.json` |
| `GET /api/news` | News feed (triggers background scrape if stale) | `data-news.json` |
| `GET /api/pipeline` | Pipeline execution phases + logs | `data-pipeline.json` |
| `GET /api/models` | AI model configurations | `data-models.json` |
| `GET /api/etfs` | ETF data (monitored + scraped categories) | `data-etfs.json` |
| `GET /api/global-monitor` | Global market monitor data | `data-global-monitor.json` |
| `GET /api/indian-indices` | Indian market indices | `data-indian-indices.json` |
| `GET /api/fii-dii` | FII/DII activity | `data-fii-dii.json` |
| `GET /api/nse500` | NSE 500 stocks | `data-nse500.json` |
| `GET /api/earnings` | Earnings calendar | `data-earnings.json` |
| `GET /api/nse` | NSE India full data | `data-nse.json` |
| `GET /api/bse` | BSE India full data | `data-bse.json` |
| `GET /api/moneycontrol-earnings` | MC earnings (Playwright) | `data-moneycontrol-earnings.json` |
| `GET /api/moneycontrol-world` | MC World news | `data-moneycontrol-world.json` |
| `GET /api/indstocks-live` | IndStocks live news | `data-indstocks-live.json` |

### Scrape/Refresh Endpoints (POST — trigger live scraping)
| Endpoint | Description | Scraper Module |
|---|---|---|
| `POST /api/news/scrape` | Scrape Zerodha + Finology | `server-scraper.ts` |
| `POST /api/global-monitor/scrape` | Scrape Bloomberg + Reuters + WorldMonitor + Alpha Vantage | `server-global-scraper.ts` + `server-alpha-vantage.ts` |
| `POST /api/indian-indices/scrape` | Scrape NSE India indices | `server-indian-indices-scraper.ts` |
| `POST /api/fii-dii/scrape` | Scrape StockEdge FII/DII | `server-fii-dii-scraper.ts` |
| `POST /api/nse500/scrape` | Scrape NSE 500 stocks | `server-nse500-scraper.ts` |
| `POST /api/earnings/scrape` | Scrape MoneyControl earnings | `server-earnings-scraper.ts` |
| `POST /api/live-earnings/scrape` | Scrape live earnings (Playwright or basic) | `server-live-earnings-playwright.ts` or `server-live-earnings-scraper.ts` |
| `POST /api/etfs/scrape` | Scrape 14 IndMoney ETF categories | `server-etf-scraper.ts` |
| `POST /api/nse/scrape` | Scrape full NSE India data | `server-nse.ts` |
| `POST /api/bse/scrape` | Scrape full BSE India data | `server-bse.ts` |
| `POST /api/moneycontrol-earnings/scrape` | Scrape MC earnings (Playwright) | `server-moneycontrol-earnings.ts` |
| `POST /api/moneycontrol-world/scrape` | Scrape MC World news | `server-moneycontrol-world.ts` |
| `POST /api/indstocks-live/scrape` | Scrape IndStocks live news | `server-indstocks-scraper.ts` |

### Quote/Detailed Data Endpoints
| Endpoint | Description |
|---|---|
| `GET /api/nse500/quote?symbol=X` | Get detailed NSE 500 stock quote |
| `GET /api/nse/quote/:symbol` | Get NSE India stock quote |
| `GET /api/nse/option-chain/:symbol` | Get NSE option chain data |
| `GET /api/bse/quote/:scripCode` | Get BSE India stock quote |
| `GET /api/bse/result-calendar` | Get BSE result calendar |
| `GET /api/bse/gainers` | Get BSE top gainers |
| `GET /api/bse/losers` | Get BSE top losers |

### Action/Computation Endpoints
| Endpoint | Description |
|---|---|
| `POST /api/signals/recalibrate` | Recalibrate trading signals (randomize + update confidence) |
| `POST /api/pipeline/reboot` | Reboot simulated pipeline (clear critical states) |
| `POST /api/etfs/rebalance` | Simulate ETF portfolio rebalancing |
| `POST /api/etfs/analyze` | Gemini AI analysis of a specific ETF |
| `POST /api/news/analyze-market` | Gemini AI market intelligence generation |
| `POST /api/models/commit` | Commit model configurations to disk |
| `POST /api/models/optimize-prompt` | Gemini AI prompt optimization |

### External API Proxy Endpoints
| Endpoint | Description |
|---|---|
| `GET /api/gnews/search` | Proxy for GNews API (requires user-provided API key) |
| `GET /api/tickertape/events` | Proxy for Tickertape events/news API |

### SSE (Server-Sent Events) Endpoints
| Endpoint | Description |
|---|---|
| `GET /api/live-earnings/stream` | Real-time live earnings data stream (60s polling interval) |

---

## 8. SCRAPER MODULE DETAILED MAP

### `server-scraper.ts` — News Scraper
- **Sources**: Zerodha Pulse (`pulse.zerodha.com`), Finology Ticker (`ticker.finology.in`)
- **Method**: HTTP fetch + Cheerio HTML parsing
- **Output**: Articles with title, URL, summary, published_at
- **Features**: Fallback selectors, deduplication, rate limiting (1s delay)

### `server-global-scraper.ts` — Global News Monitor
- **Sources**: Bloomberg (HTML scrape → RSS fallback), Reuters (HTML scrape → RSS fallback), WorldMonitor (HTML scrape → RSS multi-feed fallback)
- **RSS Feeds Used**: Google News RSS, Yahoo Finance RSS, SeekingAlpha RSS
- **Categories**: Markets, Forex, Commodities
- **Method**: HTTP fetch + Cheerio XML/HTML parsing
- **Features**: Graceful fallback chain (HTML → RSS → mock), 30s timeouts

### `server-etf-scraper.ts` — ETF Scraper
- **Source**: IndMoney (`indmoney.com/us-stocks/etfs/*`)
- **14 Categories**: S&P 500, Nasdaq, Gold, Silver, Platinum, Copper, Lithium, Rare Earth, Uranium, Oil & Gas, Natural Gas, AI, Tech, Semiconductor
- **Method**: HTTP fetch + `__NEXT_DATA__` JSON extraction (primary) or visible text pattern matching (fallback)
- **Batch Processing**: 4 categories scraped in parallel per batch
- **Fallback**: Returns comprehensive mock data if scraping fails

### `server-indian-indices-scraper.ts` — Indian Indices
- **Source**: NSE India website
- **Method**: HTTP fetch + Cheerio parsing
- **Indices**: NIFTY 50, NIFTY NEXT 50, NIFTY BANK, NIFTY FIN SERVICE, NIFTY MIDCAP 50, NIFTY AUTO, NIFTY IT, NIFTY METAL, NIFTY PHARMA, NIFTY INFRA, NIFTY ENERGY

### `server-fii-dii-scraper.ts` — FII/DII Activity
- **Source**: StockEdge (`web.stockedge.com`)
- **Method**: HTTP fetch + API/HTML parsing
- **Data**: Daily FII cash net, DII cash net, index futures/options, stock futures/options, market sentiment

### `server-nse500-scraper.ts` — NSE 500 Stocks
- **Source**: NSE India
- **Method**: HTTP fetch + API/HTML parsing
- **Data**: 500 stocks with price, change, sector, market cap, volume, 52-week range
- **Quote endpoint**: Individual stock detailed quote via API

### `server-nse.ts` — Full NSE Data (Playwright)
- **Source**: NSE India
- **Method**: Playwright browser automation
- **Data**: Market status, top gainers/losers, IPOs, option chains, corporate actions
- **Features**: Browser instance management (`closeNSE()`), cached data loading

### `server-bse.ts` — Full BSE Data (Playwright)
- **Source**: BSE India
- **Method**: Playwright browser automation
- **Data**: Top gainers/losers, result calendar, corporate actions, announcements, quotes
- **Features**: Browser instance management (`closeBSE()`), cached data loading

### `server-earnings-scraper.ts` — Earnings Calendar
- **Source**: MoneyControl
- **Method**: HTTP fetch + HTML parsing
- **Data**: Result calendar, rapid results, earnings updates, sector performers, market snapshots, price shockers

### `server-live-earnings-scraper.ts` — Live Earnings (Basic)
- **Source**: Multiple financial news sites
- **Method**: HTTP fetch + HTML parsing
- **Data**: Live earnings calls with priority levels

### `server-live-earnings-playwright.ts` — Live Earnings (Enhanced)
- **Source**: Multiple financial news sites
- **Method**: Playwright browser automation
- **Data**: Enhanced live earnings calls with deduplication and multi-source merging

### `server-moneycontrol-earnings.ts` — MC Earnings (Playwright)
- **Source**: MoneyControl
- **Method**: Playwright browser automation
- **Data**: Upcoming results, declared results, top performers, news headlines

### `server-moneycontrol-world.ts` — MC World News (Playwright)
- **Source**: MoneyControl World
- **Method**: Playwright browser automation
- **Data**: Featured articles, latest news, market updates

### `server-alpha-vantage.ts` — Alpha Vantage API
- **Source**: Alpha Vantage REST API
- **Method**: HTTP API calls with user-provided API key
- **Data**: Global market indices (FOREX, commodities, crypto, global equity indices)

### `server-indstocks-scraper.ts` — IndStocks Live News (Playwright)
- **Source**: IndStocks (`indstocks.com`)
- **Method**: Playwright browser automation
- **Data**: Live news, earnings calls, market updates, corporate actions

---

## 9. DATA PERSISTENCE MODEL

### Pattern
All data follows a consistent pattern:
1. **Default data** is hardcoded in `server.ts` (used on first run or if file is missing)
2. **`loadDB(filePath, defaultData)`** reads JSON from disk, returns default if missing/corrupt
3. **`saveDB(filePath, data)`** writes JSON to disk with pretty-printing
4. **GET endpoints** return cached data from disk
5. **POST scrape endpoints** trigger live scraping, save results to disk, return updated data

### Data Flow
```
User clicks "Scrape" → Frontend POST /api/*/scrape → Backend calls scraper module
→ Scraper fetches external site → Parses HTML/API → Returns structured data
→ Backend saves to data/*.json → Returns data to frontend → Frontend updates state
```

---

## 10. AI INTEGRATION (Google Gemini)

### API Key
- User-configurable via Settings tab
- Stored in `localStorage` (frontend) and passed via environment variable `GEMINI_API_KEY` (backend)
- Client initialized lazily via `getGeminiClient()`

### Use Cases
1. **Market Analysis** (`POST /api/news/analyze-market`):
   - User provides search context/theme
   - Gemini generates institutional-grade market bulletin (headline + impact paragraph)
   - Updates featured news story and adds to feed

2. **ETF Risk Analysis** (`POST /api/etfs/analyze`):
   - Sends ETF details (symbol, name, AUM, RSI, holdings) to Gemini
   - Generates 50-70 word institutional risk analysis
   - Falls back to cached local analysis if API unavailable

3. **Prompt Optimization** (`POST /api/models/optimize-prompt`):
   - Takes existing system prompt from model phases
   - Gemini optimizes for fidelity, parameter clarity, and token efficiency
   - Saves optimized prompt back to models config

---

## 11. REAL-TIME FEATURES

### SSE (Server-Sent Events) — Live Earnings Stream
- **Endpoint**: `GET /api/live-earnings/stream`
- **Protocol**: SSE with heartbeat (15s), polling interval (60s)
- **Client management**: Set-based client tracking, auto-cleanup on disconnect
- **Frontend**: `LiveEarningsFeed` component with `EventSource` API
- **Auto-reconnect**: Exponential backoff with max 5 attempts

### Simulated Real-time
- **Pipeline logs**: `setInterval` every 4s appends random log entries to pipeline view
- **Timer**: Elapsed seconds counter increments every 10ms
- **Signal recalibration**: Randomizes ticker prices/RSI/alpha scores on recalibrate

---

## 12. KEY TYPES (from `src/types.ts`)

### Core Trading Types
- **`Ticker`**: Stock symbol, company, sector, price, RSI, EMA200, volume flow, alpha score, sparkline data
- **`Recalibration`**: Filter toggles (RSI Exhaustion, MA200 Breakout, Dark Pool Flow) + confidence score
- **`SignalsData`**: Collection of tickers + recalibration + index exposures

### News Types
- **`NewsData`**: Featured story + feed items + suggested actions + sentiment bars + scraped info
- **`NewsScrapedInfo`**: Metadata about scraping (timestamp, sources, errors)

### Pipeline/Models Types
- **`PipelineData`**: Node metadata + execution phases (with status/progress) + log stream
- **`ModelsData`**: Latency stats + phase configurations (prompt, allocation, tokens) + system node info

### Market Data Types
- **`EtfsData`**: ETF items + global flow status + scraped categories
- **`Nse500Data`**: 500 stocks with advances/declines + individual stock data
- **`EarningsData`**: Result calendar + rapid results + sector performers + market snapshots
- **`MoneycontrolWorldData`**: Featured/latest/market-update articles
- **`TickertapeNewsItem`**: News from Tickertape with stock references

---

## 13. UI/UX CHARACTERISTICS

### Design Language
- **Dark terminal aesthetic** with black background and glassmorphism cards
- **Color scheme**: Primary white/silver accents, cyan for active states, emerald for success, rose for errors
- **Typography**: Plus Jakarta Sans (body), Geist Mono (monospace/terminal text)
- **Icons**: Material Symbols Outlined (filled variants for active states)
- **Effects**: Scanline overlay, backdrop blur (64px), orbital hover tracking, animated toast notifications

### Layout
- **Fixed left sidebar** (288px) with navigation buttons
- **Scrollable main content area** with tab-based views
- **Toast notification system** (bottom-right, auto-dismiss after 4.5s)
- **Responsive**: `hidden md:flex` for sidebar (hidden on mobile)

### Interactive Features
- **Search/filter** on most data tables
- **Manual scrape buttons** with loading spinners
- **Optimistic UI updates** (signals recalibrate immediately)
- **Detailed quote modals** (NSE 500)
- **Recharts area charts** (NSE 500 sparklines)

---

## 14. ENVIRONMENT & CONFIGURATION

### Required Environment Variables
| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (for AI features) |
| `DISABLE_HMR` | Disables Vite HMR (used in AI Studio environments) |

### User-configurable Keys (via Settings tab, stored in localStorage)
| Key | Purpose |
|---|---|
| `gnews_api_key` | GNews API key (for Conflict Tracker) |
| `alpha_vantage_api_key` | Alpha Vantage API key (for global indices) |

### Ports
- **Development**: Express server on port 3000 (with Vite middleware)
- **Production**: Express server on port 3000 (serving static dist)

---

## 15. KNOWN ARCHITECTURAL CHARACTERISTICS

### Strengths
- Comprehensive data coverage (global + Indian markets)
- Graceful fallback chains in all scrapers (HTML → RSS → mock data)
- File-based persistence is simple and debuggable
- Consistent API patterns across all modules

### Areas for Potential Improvement
1. **Monolithic App.tsx** (~4457 lines): All state and logic in a single component — prime candidate for decomposition
2. **No authentication/authorization**: All endpoints are open
3. **No database**: JSON files on disk don't scale; no concurrent write safety
4. **Simulated data**: Many features (pipeline, signals, recalibration) use randomized mock data rather than real market feeds
5. **No error boundary**: No React error boundaries for graceful failure
6. **No testing**: No test files detected
7. **No environment validation**: No Zod/Joi schema validation for env vars or API responses
8. **Playwright overhead**: Multiple Playwright browser instances (NSE, BSE, MC, IndStocks) consume significant memory
9. **No rate limiting**: Scrapers have no global rate limiter; individual scrapers use simple delays
10. **No WebSocket**: Only SSE for live earnings; could benefit from WebSocket for bidirectional communication

---

## 16. DEPENDENCY GRAPH (HIGH-LEVEL)

```
App.tsx
├── types.ts (all interfaces)
├── components/Nse500Tracker.tsx
│   └── types.ts (Nse500Data, Nse500Stock)
│   └── recharts (AreaChart, Area, XAxis, YTooltip, ResponsiveContainer)
├── components/LiveEarningsFeed.tsx
│   └── (self-contained types, SSE logic)
└── lucide-react (icons)

server.ts
├── server-scraper.ts (cheerio)
├── server-global-scraper.ts (cheerio)
├── server-etf-scraper.ts (cheerio)
├── server-indian-indices-scraper.ts
├── server-fii-dii-scraper.ts
├── server-nse500-scraper.ts
├── server-nse.ts (playwright, nse-bse-api)
├── server-bse.ts (playwright, nse-bse-api)
├── server-earnings-scraper.ts (cheerio)
├── server-live-earnings-scraper.ts (cheerio)
├── server-live-earnings-playwright.ts (playwright)
├── server-moneycontrol-earnings.ts (playwright)
├── server-moneycontrol-world.ts (playwright)
├── server-alpha-vantage.ts
├── server-indstocks-scraper.ts (playwright)
└── @google/genai (Gemini AI)
```

---

*This context graph was generated by analyzing all source files in the ORCA_V16 project without modifying any code. It provides a complete structural and functional map suitable for generating a Product Requirements Document (PRD) for further development.*