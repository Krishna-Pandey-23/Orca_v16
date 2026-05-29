import { chromium, Browser, Page } from "playwright";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface MoneycontrolEarningsCompany {
  name: string;
  symbol?: string;
  result_date: string;
  sector?: string;
  ltp?: number;
  change_pct?: number;
  revenue?: string;
  net_profit?: string;
  yoy_growth?: string;
}

export interface MoneycontrolEarningsData {
  fetched_at: string;
  source: string;
  upcoming_results: MoneycontrolEarningsCompany[];
  declared_results: MoneycontrolEarningsCompany[];
  top_performers: MoneycontrolEarningsCompany[];
  news_headlines: { title: string; url?: string; timestamp?: string }[];
}

const PATH_MC_EARNINGS_DB = path.join(DATA_DIR, "data-moneycontrol-earnings.json");

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ]
    });
  }
  return browser;
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseNumber(value: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export async function scrapeMoneycontrolEarnings(): Promise<MoneycontrolEarningsData> {
  console.log(`[MC Earnings Playwright] Starting scrape of MoneyControl Earnings...`);

  const data: MoneycontrolEarningsData = {
    fetched_at: new Date().toISOString(),
    source: "MoneyControl Earnings (Playwright)",
    upcoming_results: [],
    declared_results: [],
    top_performers: [],
    news_headlines: []
  };

  let page: Page | null = null;

  try {
    const br = await getBrowser();
    page = await br.newPage();

    // Set viewport and user agent
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

    // Navigate to MoneyControl Earnings
    console.log(`[MC Earnings Playwright] Navigating to https://www.moneycontrol.com/markets/earnings/`);
    await page.goto("https://www.moneycontrol.com/markets/earnings/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Accept cookies if prompted
    try {
      const acceptCookies = await page.$('button:has-text("Accept"), button:has-text("I Agree")');
      if (acceptCookies) {
        await acceptCookies.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Cookie banner might not be present
    }

    // Scrape upcoming results
    try {
      console.log(`[MC Earnings Playwright] Scraping upcoming results...`);
      await page.waitForSelector("table, .dataTbl, .bors_tbl, .result_calender", { timeout: 5000 })
        .catch(() => console.log("Table selector not found for upcoming results"));

      const upcomingElements = await page.$$eval("table tr, .result_calender tr, .dataTbl tbody tr", (rows) => {
        return rows.map((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 2) {
            return {
              company: cells[0]?.textContent?.trim() || "",
              date: cells[1]?.textContent?.trim() || "",
              sector: cells[2]?.textContent?.trim() || "",
              ltp: cells[3]?.textContent?.trim() || "",
            };
          }
          return null;
        }).filter(Boolean);
      });

      upcomingElements.forEach((item: any) => {
        if (item && item.company) {
          data.upcoming_results.push({
            name: item.company.substring(0, 60),
            result_date: item.date || new Date().toLocaleDateString(),
            sector: item.sector || "",
            ltp: parseNumber(item.ltp)
          });
        }
      });

      console.log(`[MC Earnings Playwright] Scraped ${data.upcoming_results.length} upcoming results`);
    } catch (err: any) {
      console.warn(`[MC Earnings Playwright] Error scraping upcoming results: ${err.message}`);
    }

    // Scrape declared results / earnings news
    try {
      console.log(`[MC Earnings Playwright] Scraping earnings news headlines...`);
      const newsLinks = await page.$$eval("a[href*='earnings'], a[href*='results'], .news_item, .headline_item, .article_item", (links) => {
        return links.map((link) => {
          const titleEl = link.querySelector("h3, h4, .title, .headline, .news_title, span, strong");
          const title = titleEl?.textContent?.trim() || link.textContent?.trim();
          if (title && title.length > 15 && title.length < 200) {
            const href = link.getAttribute("href") || "";
            return {
              title: title.substring(0, 200),
              url: href ? (href.startsWith("http") ? href : `https://www.moneycontrol.com${href}`) : undefined
            };
          }
          return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);
      });

      data.news_headlines = newsLinks.slice(0, 30);
      console.log(`[MC Earnings Playwright] Scraped ${data.news_headlines.length} earnings headlines`);
    } catch (err: any) {
      console.warn(`[MC Earnings Playwright] Error scraping earnings news: ${err.message}`);
    }

    // Scrape top performer stocks if available
    try {
      console.log(`[MC Earnings Playwright] Scraping top performers...`);
      const performers = await page.$$eval(".top_performer, .gainer_item, .performer_item, .stock_item", (items) => {
        return items.map((item) => {
          const nameEl = item.querySelector("a, .company_name, .stock_name, strong");
          const priceEl = item.querySelector(".price, .ltp, .current_price");
          const changeEl = item.querySelector(".change, .pChange, .percent_change");

          const name = nameEl?.textContent?.trim() || "";
          const price = priceEl?.textContent?.trim() || "";
          const change = changeEl?.textContent?.trim() || "";

          if (name && name.length > 1) {
            return {
              name: name.substring(0, 80),
              ltp: price,
              change_pct: change
            };
          }
          return null;
        }).filter(Boolean);
      });

      performers.forEach((item: any) => {
        if (item) {
          data.top_performers.push({
            name: item.name,
            ltp: parseNumber(item.ltp),
            change_pct: parseNumber(item.change_pct),
            result_date: new Date().toLocaleDateString()
          });
        }
      });

      console.log(`[MC Earnings Playwright] Scraped ${data.top_performers.length} top performers`);
    } catch (err: any) {
      console.warn(`[MC Earnings Playwright] Error scraping top performers: ${err.message}`);
    }

    // Scrape declared results (companies that have announced results)
    try {
      console.log(`[MC Earnings Playwright] Scraping declared results section...`);

      // Look for tabs or sections that show declared results
      const declaredTab = await page.$('a:has-text("Declared"), button:has-text("Declared Results"), [data-tab="declared"]');
      if (declaredTab) {
        await declaredTab.click();
        await page.waitForTimeout(1000);
      }

      const declaredRows = await page.$$eval("table tr, .result_table tr, .declared_results tr", (rows) => {
        return rows.map((row) => {
          const cells = row.querySelectorAll("td");
          if (cells.length >= 3) {
            const company = cells[0]?.textContent?.trim() || "";
            const period = cells[1]?.textContent?.trim() || "";
            const sales = cells[2]?.textContent?.trim() || "";
            const profit = cells[3]?.textContent?.trim() || "";

            if (company && company.length > 1) {
              return {
                name: company.substring(0, 80),
                period,
                sales,
                profit
              };
            }
          }
          return null;
        }).filter(Boolean);
      });

      declaredRows.forEach((item: any) => {
        if (item) {
          data.declared_results.push({
            name: item.name,
            result_date: item.period || new Date().toLocaleDateString(),
            revenue: item.sales,
            net_profit: item.profit
          });
        }
      });

      console.log(`[MC Earnings Playwright] Scraped ${data.declared_results.length} declared results`);
    } catch (err: any) {
      console.warn(`[MC Earnings Playwright] Error scraping declared results: ${err.message}`);
    }

    // Save to cache
    try {
      fs.writeFileSync(PATH_MC_EARNINGS_DB, JSON.stringify(data, null, 2), "utf-8");
      console.log(`[MC Earnings Playwright] Saved data to cache`);
    } catch (saveErr) {
      console.error(`[MC Earnings Playwright] Failed to save cache: ${saveErr}`);
    }

    console.log(`[MC Earnings Playwright] ========== SCRAPE COMPLETE ==========`);

    return data;

  } catch (err: any) {
    console.error(`[MC Earnings Playwright] Error during scraping: ${err.message}`);

    // Try to load from cache on failure
    try {
      if (fs.existsSync(PATH_MC_EARNINGS_DB)) {
        const cached = JSON.parse(fs.readFileSync(PATH_MC_EARNINGS_DB, "utf-8"));
        console.log(`[MC Earnings Playwright] Returning cached data from ${cached.fetched_at}`);
        return cached;
      }
    } catch (cacheErr) {
      console.error(`[MC Earnings Playwright] Failed to load cache: ${cacheErr}`);
    }

    // Return empty data structure on complete failure
    return data;
  } finally {
    if (page) {
      await page.close();
    }
  }
}

export function loadCachedMoneycontrolEarnings(): MoneycontrolEarningsData | null {
  try {
    if (fs.existsSync(PATH_MC_EARNINGS_DB)) {
      const cached = JSON.parse(fs.readFileSync(PATH_MC_EARNINGS_DB, "utf-8"));
      console.log(`[MC Earnings Loader] Loaded cached MoneyControl earnings`);
      return cached;
    }
  } catch (err) {
    console.warn("[MC Earnings Loader] Cache load failed:", err);
  }
  return null;
}
