# Project Context Graph – Gemma

## Overview
This repository is a **financial data aggregation and live‑earnings‑tracker web application** built with:
- **Node/TypeScript** back‑end servers that scrape a variety of public finance websites (NSE, MoneyControl, Alpha Vantage, BSE, etc.).
- **React + Vite** front‑end (located in `src/`) that visualises the scraped data, provides a live earnings feed and tracks the NIFTY‑500 index.
- Several **utility scrapers** and **play‑wright** scripts to obtain data that is not exposed via public APIs.

The project is organized into three logical layers:
1. **Scraper/Server Layer** – All `.ts` files at the repository root (e.g., `server-nse.ts`, `server-moneycontrol-earnings.ts`, `server-global-scraper.ts`).
2. **API / Server Entrypoint** – `server.ts` (Express‑style HTTP server that aggregates the individual scrapers and exposes a JSON API).
3. **Front‑end Layer** – `src/` (React components, TypeScript types, Vite config).

---

## Directory Structure & Key Files
| Path | Purpose |
|------|---------|
| `server.ts` | Main HTTP server using **Express** (or similar). Registers routes that invoke the scraper modules and returns JSON to the front‑end. |
| `server-*.ts` (e.g., `server-nse.ts`, `server-moneycontrol-earnings.ts`) | Individual scraper implementations. Each module contains a function that fetches data from a specific source (NSE, MoneyControl, Alpha Vantage, BSE, ETFs, etc.) and returns a normalized JavaScript object. |
| `server-live-earnings-playwright.ts` | Uses **Playwright** to load dynamic pages (e.g., live earnings tables) that cannot be scraped with simple HTTP requests. |
| `server-scraper.ts` | Common utilities shared across scrapers (request handling, retry logic, CSV/JSON parsers). |
| `src/` | React front‑end source.
| `src/main.tsx` | Application entry point – mounts the React app onto the DOM. |
| `src/App.tsx` | Root component that sets up routing and layout. |
| `src/components/LiveEarningsFeed.tsx` | Component that polls the `/api/live‑earnings` endpoint and renders a scrolling list of upcoming earnings calls. |
| `src/components/Nse500Tracker.tsx` | Visualises real‑time NIFTY‑500 data (price updates, market cap, etc.) using the `/api/nse500` endpoint. |
| `src/types.ts` | Central TypeScript interfaces that describe the shape of data received from the back‑end (e.g., `EarningEvent`, `StockQuote`, `ETFData`). |
| `vite.config.ts` | Vite configuration for development / production builds. |
| `index.html` | HTML template used by Vite to inject the bundled React app. |
| `ORCA_V16_CONTEXT_GRAPH.md` | Existing context graph (likely older version). |
| `README.md` | High‑level project description and setup instructions. |
| `server‑*.ts` scripts under root | Stand‑alone Node scripts that can be executed manually (`node server-nse.ts`) for debugging or scheduled cron jobs. |
| `shims/` | Compatibility shims for Node‑specific globals when bundling for the browser. |

---

## Data Flow (High‑Level Context Graph)
1. **User opens the web app** → `index.html` loads bundled JavaScript.
2. **React app boots** (`src/main.tsx`) → renders `<App />`.
3. **Components request data** via `fetch` to the back‑end (e.g., `GET /api/live‑earnings`).
4. **`server.ts` receives the request** and forwards it to the appropriate scraper module:
   - `server-live-earnings-scraper.ts` → scrapes live earnings tables.
   - `server-nse.ts` → fetches NIFTY‑500 quote data.
   - `server-moneycontrol-earnings.ts` → obtains earnings calendar.
5. **Scraper modules** may:
   - Perform a **plain HTTP request** (using `axios`/`node-fetch`).
   - Use **Playwright** for dynamic content (headless Chromium).
   - Parse CSV/JSON responses and **normalize** them to the shared TypeScript interfaces.
6. **Result is returned** to `server.ts`, which sends a JSON payload back to the front‑end.
7. **React components** update state, re‑render UI, and optionally cache data locally (e.g., using `useEffect` + `setInterval` for periodic refresh).

---

## Module Interaction Map
```
[Front‑end]                         [Back‑end]
   │                                   │
   │  fetch('/api/...')                │
   ▼                                   ▼
src/App.tsx ──► server.ts ──► server‑<source>.ts
   │                                   │
   │  receives JSON                     │
   ▼                                   ▼
Component (LiveEarningsFeed)   Scraper Logic (axios / Playwright)
```

- **Shared Types** (`src/types.ts`) are imported by both front‑end components and back‑end scrapers to guarantee contract consistency.
- **Utility Layer** (`server-scraper.ts`) provides helpers like `retryRequest`, `parseCSV`, and generic `fetchJson` used across all scraper modules.
- **Deployment**: The project can be run locally with `npm run dev` (Vite dev server proxies API calls to the Node server) or built (`npm run build`) and served as a static bundle with the Node API attached.

---

## Extensibility Points (Where to Add New Features)
| Area | What to Extend |
|------|----------------|
| **New Data Source** | Add a new `server-<name>.ts` implementing a `fetch<Name>()` function; register a route in `server.ts`. |
| **Front‑end Visualization** | Create a new React component under `src/components/`, define a corresponding TypeScript interface in `src/types.ts`, and consume the new API endpoint. |
| **Scheduling / Cron** | Use a process manager (PM2, cron, GitHub Actions) to periodically run scraper scripts and store results in a DB (currently data is returned on‑fly). |
| **Testing** | Add unit tests for scraper functions (e.g., using Jest) and component snapshots. |
| **Authentication / Rate‑Limiting** | Wrap API routes with middleware in `server.ts` to enforce API keys or request throttling. |

---

## Quick Start / Development Checklist
1. **Install dependencies**: `npm install`
2. **Run back‑end**: `node server.ts` (or `npm run server` if defined).
3. **Run front‑end dev server**: `npm run dev` – Vite proxies `/api/*` to the back‑end.
4. **Visit** `http://localhost:5173` (default Vite port) to see the UI.
5. **Run a scraper directly** for debugging, e.g., `node server-nse.ts`.

---

*This Context Graph is purposely lightweight – it captures the high‑level architecture, key modules, and data flow without modifying any existing code. It can be fed directly to Claude (or another LLM) to generate a Product Requirements Document (PRD) for future enhancements.*
