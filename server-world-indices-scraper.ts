import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

export interface WorldIndex {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: string | null;
  dayRangeLow: number | null;
  dayRangeHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  currency: string | null;
  exchangeName: string | null;
  marketState: string | null;
  region: string | null;
}

export interface ScrapeResult {
  indices: WorldIndex[];
  fetchedAt: string;
  source: string;
  totalCount: number;
}

const SCRIPT = path.join(process.cwd(), "fetch_indices.py");
const TIMEOUT_MS = 60_000;

function runPython(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use 'python' on Windows, 'python3' on Unix-like systems
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    console.log(`[scraper] Spawning: ${pythonCmd} ${script}`);
    console.log(`[scraper] Script path: ${script}`);
    console.log(`[scraper] Script exists: ${fs.existsSync(script)}`);
    const t0 = Date.now();

    const proc = spawn(pythonCmd, [script]);
    let stdout = "";
    let stdoutBytes = 0;

    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
      stdoutBytes += d.length;
    });

    // Forward Python's stderr lines directly to our terminal in real time
    proc.stderr.on("data", (d: Buffer) => {
      process.stderr.write(d); // already has [yfinance] prefix and newline from Python
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`[scraper] python3 timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
      if (code !== 0) {
        console.error(`[scraper] python3 exited with code ${code} after ${elapsed}s`);
        reject(new Error(`Python exited ${code}`));
      } else {
        console.log(`[scraper] python3 finished in ${elapsed}s — stdout: ${stdoutBytes} bytes`);
        resolve(stdout);
      }
    });

    proc.on("error", (e: Error) => {
      clearTimeout(timer);
      console.error(`[scraper] Failed to spawn python3: ${e.message}`);
      reject(e);
    });
  });
}

export async function scrapeWorldIndices(): Promise<ScrapeResult> {
  console.log(`[scraper] scrapeWorldIndices() called`);

  const raw = await runPython(SCRIPT);

  let parsed: any;
  try {
    parsed = JSON.parse(raw.trim());
  } catch (e) {
    console.error(`[scraper] JSON parse failed. Raw output (first 500 chars):\n${raw.slice(0, 500)}`);
    throw new Error(`Python output was not valid JSON`);
  }

  if (!parsed.success) {
    console.error(`[scraper] Python reported failure: ${parsed.error}`);
    throw new Error(`fetch_indices.py: ${parsed.error}`);
  }

  const withPrice = (parsed.indices as WorldIndex[]).filter(i => i.price !== null).length;
  console.log(`[scraper] Parsed ${parsed.totalCount} indices — ${withPrice} with price data, source: ${parsed.source}, fetchedAt: ${parsed.fetchedAt}`);

  // Warn loudly about any index that came back with no price
  const nullPrices = (parsed.indices as WorldIndex[]).filter(i => i.price === null);
  if (nullPrices.length > 0) {
    console.warn(`[scraper] ${nullPrices.length} indices returned null price: ${nullPrices.map(i => i.symbol).join(", ")}`);
  }

  return {
    indices:    parsed.indices as WorldIndex[],
    fetchedAt:  parsed.fetchedAt,
    source:     parsed.source,
    totalCount: parsed.totalCount,
  };
}