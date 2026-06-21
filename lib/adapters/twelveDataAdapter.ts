import type { Candle } from "@/lib/types";

const BASE_URL = "https://api.twelvedata.com";

function requireApiKey(): string {
  const key = process.env.TWELVEDATA_API_KEY;
  if (!key) {
    throw new Error(
      "TWELVEDATA_API_KEY is not set. Add it in your Vercel project's Environment Variables."
    );
  }
  return key;
}

export async function getDailyCandles(symbol: string, outputSize = 90): Promise<Candle[]> {
  const key = requireApiKey();
  const params = new URLSearchParams({
    symbol,
    interval: "1day",
    outputsize: String(outputSize),
    apikey: key,
  });

  const res = await fetch(`${BASE_URL}/time_series?${params.toString()}`, {
    cache: "no-store",
  });

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
