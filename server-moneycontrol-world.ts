import { chromium, Browser, Page } from "playwright";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface MoneycontrolWorldArticle {
  title: string;
  url?: string;
  summary?: string;
  image_url?: string;
  timestamp?: string;
  category?: string;
  source?: string;
}

export interface MoneycontrolWorldData {
  fetched_at: string;
  source: string;
  url: string;
  featured_articles: MoneycontrolWorldArticle[];
  latest_news: MoneycontrolWorldArticle[];
  market_updates: MoneycontrolWorldArticle[];
}

const PATH_MC_WORLD_DB = path.join(DATA_DIR, "data-moneycontrol-world.json");

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

export async function closeBrowserWorld() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function scrapeMoneycontrolWorld(): Promise<MoneycontrolWorldData> {
  console.log(`[MC World Playwright] Starting scrape of MoneyControl World...`);

  const data: MoneycontrolWorldData = {
    fetched_at: new Date().toISOString(),
    source: "MoneyControl World",
    url: "https://www.moneycontrol.com/world/",
    featured_articles: [],
    latest_news: [],
    market_updates: []
  };

  let page: Page | null = null;

  try {
    const br = await getBrowser();
    page = await br.newPage();

    // Set viewport and user agent
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

    // Navigate to MoneyControl World
    console.log(`[MC World Playwright] Navigating to https://www.moneycontrol.com/world/`);
    await page.goto("https://www.moneycontrol.com/world/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Accept cookies if prompted
    try {
      const acceptCookies = await page.$('button:has-text("Accept"), button:has-text("I Agree"), #cookie-warn button');
      if (acceptCookies) {
        await acceptCookies.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Cookie banner might not be present
    }

    // Scrape featured/hero articles
    try {
      console.log(`[MC World Playwright] Scraping featured articles...`);

      const featuredArticles = await page.$$eval(".hero_article, .featured_item, .top-story, .main_article, article.featured, .lead_article", (articles) => {
        return articles.map((article) => {
          const titleEl = article.querySelector("h1, h2, h3, a.title, .headline, .article_title");
          const title = titleEl?.textContent?.trim() || "";
          const href = titleEl?.getAttribute("href") || article.querySelector("a")?.getAttribute("href") || "";
          const summaryEl = article.querySelector("p, .summary, .description, .desc");
          const summary = summaryEl?.textContent?.trim() || "";
          const imgEl = article.querySelector("img");
          const imageUrl = imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "";
          const timeEl = article.querySelector("time, .timestamp, .date, .published_time");
          const timestamp = timeEl?.textContent?.trim() || "";

          if (title && title.length > 10) {
            return {
              title: title.substring(0, 200),
              url: href ? (href.startsWith("http") ? href : `https://www.moneycontrol.com${href}`) : undefined,
              summary: summary.substring(0, 300) || undefined,
              image_url: imageUrl || undefined,
              timestamp: timestamp || undefined
            };
          }
          return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);
      });

      data.featured_articles = featuredArticles.slice(0, 10);
      console.log(`[MC World Playwright] Scraped ${data.featured_articles.length} featured articles`);
    } catch (err: any) {
      console.warn(`[MC World Playwright] Error scraping featured articles: ${err.message}`);
    }

    // Scrape latest news items
    try {
      console.log(`[MC World Playwright] Scraping latest news...`);

      const latestNews = await page.$$eval(".news_item, .article_item, .story_item, .news-list li, li.news, article", (items) => {
        return items.map((item) => {
          const titleEl = item.querySelector("a, h3, h4, .title, .headline, strong");
          const title = titleEl?.textContent?.trim() || "";
          const href = titleEl?.getAttribute("href") || item.querySelector("a")?.getAttribute("href") || "";
          const timeEl = item.querySelector("time, .date, .timestamp, .ago");
          const timestamp = timeEl?.textContent?.trim() || "";
          const summaryEl = item.querySelector("p, .summary, .desc");
          const summary = summaryEl?.textContent?.trim() || "";

          // Filter out items already in featured
          if (title && title.length > 15 && title.length < 200) {
            return {
              title: title.substring(0, 200),
              url: href ? (href.startsWith("http") ? href : `https://www.moneycontrol.com${href}`) : undefined,
              summary: summary.substring(0, 200) || undefined,
              timestamp: timestamp || undefined
            };
          }
          return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);
      });

      // Deduplicate and filter
      const seenTitles = new Set(data.featured_articles.map(a => a.title));
      data.latest_news = latestNews.filter(item => !seenTitles.has(item.title)).slice(0, 25);
      console.log(`[MC World Playwright] Scraped ${data.latest_news.length} latest news items`);
    } catch (err: any) {
      console.warn(`[MC World Playwright] Error scraping latest news: ${err.message}`);
    }

    // Scrape market updates if available
    try {
      console.log(`[MC World Playwright] Scraping market updates...`);

      const marketUpdates = await page.$$eval(".market_update, .market_item, .market_news li, .market-section li", (items) => {
        return items.map((item) => {
          const titleEl = item.querySelector("a, strong, .title");
          const title = titleEl?.textContent?.trim() || "";
          const href = titleEl?.getAttribute("href") || item.querySelector("a")?.getAttribute("href") || "";
          const categoryEl = item.querySelector(".category, .tag, .label");
          const category = categoryEl?.textContent?.trim() || "";

          if (title && title.length > 10) {
            return {
              title: title.substring(0, 200),
              url: href ? (href.startsWith("http") ? href : `https://www.moneycontrol.com${href}`) : undefined,
              category: category || "Markets"
            };
          }
          return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);
      });

      data.market_updates = marketUpdates.slice(0, 15);
      console.log(`[MC World Playwright] Scraped ${data.market_updates.length} market updates`);
    } catch (err: any) {
      console.warn(`[MC World Playwright] Error scraping market updates: ${err.message}`);
    }

    // Save to cache
    try {
      fs.writeFileSync(PATH_MC_WORLD_DB, JSON.stringify(data, null, 2), "utf-8");
      console.log(`[MC World Playwright] Saved data to cache`);
    } catch (saveErr) {
      console.error(`[MC World Playwright] Failed to save cache: ${saveErr}`);
    }

    console.log(`[MC World Playwright] ========== SCRAPE COMPLETE ==========`);

    return data;

  } catch (err: any) {
    console.error(`[MC World Playwright] Error during scraping: ${err.message}`);

    // Try to load from cache on failure
    try {
      if (fs.existsSync(PATH_MC_WORLD_DB)) {
        const cached = JSON.parse(fs.readFileSync(PATH_MC_WORLD_DB, "utf-8"));
        console.log(`[MC World Playwright] Returning cached data from ${cached.fetched_at}`);
        return cached;
      }
    } catch (cacheErr) {
      console.error(`[MC World Playwright] Failed to load cache: ${cacheErr}`);
    }

    // Return empty data structure on complete failure
    return data;
  } finally {
    if (page) {
      await page.close();
    }
  }
}

export function loadCachedMoneycontrolWorld(): MoneycontrolWorldData | null {
  try {
    if (fs.existsSync(PATH_MC_WORLD_DB)) {
      const cached = JSON.parse(fs.readFileSync(PATH_MC_WORLD_DB, "utf-8"));
      console.log(`[MC World Loader] Loaded cached MoneyControl World data`);
      return cached;
    }
  } catch (err) {
    console.warn("[MC World Loader] Cache load failed:", err);
  }
  return null;
}
