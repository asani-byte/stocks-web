import type { Candle, PriceAdapter, Quote } from "@/lib/types";

const BASE_URL = "https://finnhub.io/api/v1";

function requireApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error(
      "FINNHUB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  return key;
}

export class FinnhubAdapter implements PriceAdapter {
  async getQuote(symbol: string): Promise<Quote> {
    const key = requireApiKey();
    const res = await fetch(
      `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error(`Finnhub quote request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (typeof data.c !== "number" || data.c === 0) {
      throw new Error(`No quote data returned for symbol "${symbol}"`);
    }

    return {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: data.t,
    };
  }

  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<Candle[]> {
    const key = requireApiKey();
    const params = new URLSearchParams({
      symbol,
      resolution,
      from: String(from),
      to: String(to),
      token: key,
    });

    const res = await fetch(`${BASE_URL}/stock/candle?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Finnhub candle request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.s !== "ok" || !Array.isArray(data.c)) {
      return [];
    }

    const candles: Candle[] = data.t.map((timestamp: number, i: number) => ({
      timestamp,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));

    return candles;
  }
}
