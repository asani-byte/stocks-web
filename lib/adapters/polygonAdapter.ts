import type { Candle, PriceAdapter, Quote } from "@/lib/types";

const BASE_URL = "https://api.polygon.io";

function requireApiKey(): string {
  const key = process.env.POLYGON_API_KEY;
  if (!key) {
    throw new Error(
      "POLYGON_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  return key;
}

export class PolygonAdapter implements PriceAdapter {
  async getQuote(symbol: string): Promise<Quote> {
    const key = requireApiKey();
    const [prevRes, lastRes] = await Promise.all([
      fetch(`${BASE_URL}/v2/aggs/ticker/${symbol}/prev?apiKey=${key}`, {
        cache: "no-store",
      }),
      fetch(`${BASE_URL}/v2/last/trade/${symbol}?apiKey=${key}`, {
        cache: "no-store",
      }),
    ]);

    if (!prevRes.ok || !lastRes.ok) {
      throw new Error(`Polygon quote request failed for "${symbol}"`);
    }

    const prev = await prevRes.json();
    const last = await lastRes.json();

    const prevBar = prev.results?.[0];
    if (!prevBar) {
      throw new Error(`No previous-day data returned for symbol "${symbol}"`);
    }

    const price = last.results?.p ?? prevBar.c;
    const change = price - prevBar.c;
    const changePercent = (change / prevBar.c) * 100;

    return {
      symbol,
      price,
      change,
      changePercent,
      high: prevBar.h,
      low: prevBar.l,
      open: prevBar.o,
      previousClose: prevBar.c,
      timestamp: Math.floor((last.results?.t ?? Date.now()) / 1000),
    };
  }

  async getCandles(
    symbol: string,
    resolution: string,
    from: number,
    to: number
  ): Promise<Candle[]> {
    const key = requireApiKey();
    const { multiplier, timespan } = mapResolution(resolution);

    const fromDate = new Date(from * 1000).toISOString().split("T")[0];
    const toDate = new Date(to * 1000).toISOString().split("T")[0];

    const url = `${BASE_URL}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&apiKey=${key}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Polygon candle request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((bar: any) => ({
      timestamp: Math.floor(bar.t / 1000),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
  }
}

function mapResolution(resolution: string): { multiplier: number; timespan: string } {
  switch (resolution) {
    case "1":
      return { multiplier: 1, timespan: "minute" };
    case "5":
      return { multiplier: 5, timespan: "minute" };
    case "15":
      return { multiplier: 15, timespan: "minute" };
    case "30":
      return { multiplier: 30, timespan: "minute" };
    case "60":
      return { multiplier: 1, timespan: "hour" };
    case "D":
      return { multiplier: 1, timespan: "day" };
    case "W":
      return { multiplier: 1, timespan: "week" };
    case "M":
      return { multiplier: 1, timespan: "month" };
    default:
      return { multiplier: 1, timespan: "day" };
  }
}
