import type { Candle } from "@/lib/types";

const BASE_URL = "https://api.twelvedata.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 8000;

function requireApiKey(): string {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) {
    throw new Error(
      "TWELVEDATA_API_KEY is not set. Add it in your Vercel project's Environment Variables."
    );
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getDailyCandles(symbol: string, outputSize = 90): Promise<Candle[]> {
  const key = requireApiKey();
  const params = new URLSearchParams({
    symbol,
    interval: "1day",
    outputsize: String(outputSize),
    apikey: key,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${BASE_URL}/time_series?${params.toString()}`, {
      cache: "no-store",
    });

    if (res.status === 429) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      lastError = new Error(`Twelve Data rate limited (429) on attempt ${attempt + 1}`);
      if (attempt < MAX_RETRIES) {
        await sleep(backoff);
        continue;
      }
      throw new Error(
        `Twelve Data candle request failed after ${MAX_RETRIES + 1} attempts due to rate limiting (429). Try again in a minute.`
      );
    }

    if (!res.ok) {
      throw new Error(`Twelve Data candle request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.status === "error" || !Array.isArray(data.values)) {
      throw new Error(`Twelve Data error for "${symbol}": ${data.message ?? "unknown error"}`);
    }

    const candles: Candle[] = data.values
      .map((bar: any) => ({
        timestamp: Math.floor(new Date(bar.datetime).getTime() / 1000),
        open: parseFloat(bar.open),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
        close: parseFloat(bar.close),
        volume: parseFloat(bar.volume ?? "0"),
      }))
      .reverse();

    return candles;
  }

  throw lastError ?? new Error(`Twelve Data candle request failed for "${symbol}"`);
}
