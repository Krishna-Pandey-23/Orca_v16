import * as cheerio from "cheerio";

export const NEWS_TARGET_URLS = [
  "https://pulse.zerodha.com/",
  "https://ticker.finology.in/",
];

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function collectZerodhaPulseArticles(html: string): any[] {
  console.log("[News Scraper] Parsing Zerodha Pulse HTML...");
  const $ = cheerio.load(html);
  const articles: any[] = [];
  const seen = new Set<string>();

  $("li.box.item").each((_, item) => {
    const titleNode = $(item).find("h2.title a");
    if (titleNode.length === 0) return;

    const url = titleNode.attr("href") || "";
    const title = normalize(titleNode.text());
    if (title.length < 18 || seen.has(url)) return;
    seen.add(url);

    const summaryNode = $(item).find(".desc");
    const summary = summaryNode.length > 0 ? normalize(summaryNode.text()) : undefined;

    const dateNode = $(item).find(".date");
    const published_at = dateNode.attr("title") || normalize(dateNode.text()) || undefined;

    articles.push({
      type: "PulseCompact",
      title,
      url,
      summary,
      published_at,
    });

    // Similar articles
    $(item).find("ul.similar li").each((_, similar) => {
      const similarTitleNode = $(similar).find("a.title2");
      if (similarTitleNode.length === 0) return;

      const similarUrl = similarTitleNode.attr("href") || "";
      const similarTitle = normalize(similarTitleNode.text());
      if (similarTitle.length < 18 || seen.has(similarUrl)) return;
      seen.add(similarUrl);

      const simDateNode = $(similar).find(".date");
      const simPublishedAt = simDateNode.attr("title") || normalize(simDateNode.text()) || published_at;

      articles.push({
        type: "PulseCompact",
        title: similarTitle,
        url: similarUrl,
        summary: undefined,
        published_at: simPublishedAt,
      });
    });
  });

  // Fallback if specific classes changed
  if (articles.length === 0) {
    console.log("[News Scraper] Zerodha: Using fallback selector...");
    $("ul#news li").each((_, item) => {
      const anchor = $(item).find("h2.title a, a").first();
      const href = anchor.attr("href") || "";
      const title = normalize(anchor.text());
      const date = normalize($(item).find(".date").text());

      if (title.length >= 18 && !seen.has(href)) {
        seen.add(href);
        articles.push({
          type: "PulseCompact",
          title,
          url: href,
          summary: undefined,
          published_at: date || new Date().toLocaleTimeString() + " UTC",
        });
      }
    });
  }

  console.log(`[News Scraper] Zerodha Pulse: Found ${articles.length} articles`);
  return articles;
}

function collectFinologyTickerNews(html: string): any[] {
  console.log("[News Scraper] Parsing Finology Ticker HTML...");
  const $ = cheerio.load(html);
  const articles: any[] = [];
  const seen = new Set<string>();

  // Parse news items from Finology Ticker homepage
  // Look for all newslink elements
  $("a.newslink").each((_, item) => {
    const title = normalize($(item).find("span.h6").text());
    const timestamp = normalize($(item).find("small").first().text());
    const badge = $(item).find(".badge").text().trim();
    const section = $(item).attr("data-subsecname") || "";
    const details = $(item).attr("data-details") || "";

    if (!title || title.length < 10 || seen.has(title)) return;
    seen.add(title);

    // Determine the publisher from badge or section
    let publisher = "Finology Ticker";
    if (badge) {
      publisher = badge;
    } else if (section) {
      publisher = section.replace(/_/g, " ");
    }

    articles.push({
      type: "Detailed",
      title,
      url: details ? `https://ticker.finology.in/news/${details}` : "",
      summary: undefined,
      published_at: timestamp,
      publisher,
      article_kind: "article",
    });
  });

  // Also try parsing from specific sections
  $("div[class*='news'], div[class*='story']").each((_, item) => {
    const title = normalize($(item).find("h3, h4, .title, .headline, span.h6").first().text());
    const summary = normalize($(item).find("p, .desc, .summary").first().text());
    const timestamp = normalize($(item).find("time, .date, small").first().text());
    const url = $(item).find("a").first().attr("href") || "";

    if (title && title.length >= 10 && !seen.has(title)) {
      seen.add(title);
      articles.push({
        type: "Detailed",
        title,
        url: url.startsWith("http") ? url : url ? `https://ticker.finology.in${url}` : "",
        summary: summary || undefined,
        published_at: timestamp || undefined,
        publisher: "Finology Ticker",
        article_kind: "article",
      });
    }
  });

  console.log(`[News Scraper] Finology Ticker: Found ${articles.length} articles`);
  return articles;
}

export async function scrapeNewsSource(url: string): Promise<any> {
  console.log(`[News Scraper] Fetching ${url}...`);

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    console.log(`[News Scraper] ${url} - Status: ${res.status}`);

    if (!res.ok) {
      console.error(`[News Scraper] ${url} - Failed with status ${res.status}`);
      return {
        error: {
          kind: "bad_status",
          url,
          status: res.status,
          message: `Received status code ${res.status}`
        }
      };
    }

    const html = await res.text();
    console.log(`[News Scraper] ${url} - Received ${html.length} bytes of HTML`);

    const $ = cheerio.load(html);
    const pageTitle = $("title").text().trim() || null;

    let articles: any[] = [];
    if (url.includes("zerodha.com")) {
      articles = collectZerodhaPulseArticles(html);
    } else if (url.includes("finology.in") || url.includes("ticker.finology")) {
      articles = collectFinologyTickerNews(html);
    }

    if (articles.length === 0) {
      console.warn(`[News Scraper] ${url} - No articles found after parsing`);
      return {
        error: {
          kind: "parse",
          url,
          message: "No news articles found on the webpage."
        }
      };
    }

    const sourceName = url.includes("zerodha") ? "zerodha_pulse" : "finology_ticker";
    console.log(`[News Scraper] ${url} - Success: ${articles.length} articles from ${sourceName}`);

    return {
      source: sourceName,
      url,
      status: res.status,
      fetched_at: new Date().toISOString(),
      page_title: pageTitle,
      articles,
    };
  } catch (err: any) {
    console.error(`[News Scraper] ${url} - Error: ${err.message}`);
    return {
      error: {
        kind: "request",
        url,
        message: err.message || "Failed to make HTTP connections to the server."
      }
    };
  }
}

export async function scrapeAllSources(): Promise<any> {
  console.log("[News Scraper] Starting scrape of all sources...");
  const sources: any[] = [];
  const errors: any[] = [];

  // Process sources sequentially with delays to avoid rate limiting
  for (const url of NEWS_TARGET_URLS) {
    console.log(`[News Scraper] Processing: ${url}`);
    const item = await scrapeNewsSource(url);

    if (item.error) {
      console.error(`[News Scraper] Failed: ${url} - ${item.error.message}`);
      errors.push(item.error);
    } else {
      console.log(`[News Scraper] Success: ${url} - ${item.articles.length} articles`);
      sources.push(item);
    }

    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const result = {
    scraped_at: new Date().toISOString(),
    sources,
    errors,
  };

  console.log(`[News Scraper] Complete: ${sources.length} sources, ${errors.length} errors`);
  console.log(`[News Scraper] Total articles: ${sources.reduce((sum, s) => sum + (s.articles?.length || 0), 0)}`);

  return result;
}
