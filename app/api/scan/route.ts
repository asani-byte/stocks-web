import { NextResponse } from "next/server";
import { getPriceAdapter } from "@/lib/adapters";
import { NewsApiAdapter } from "@/lib/adapters/newsApiAdapter";
import { getDailyCandles } from "@/lib/adapters/twelveDataAdapter";
import { buildTechnicalSnapshot } from "@/lib/engine/technicals";
import { scoreNewsBatch } from "@/lib/engine/sentiment";
import { generateSignal } from "@/lib/engine/signalEngine";
import { SCAN_UNIVERSE } from "@/lib/scanUniverse";
import type { Signal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scanOneSymbol(symbol: string): Promise<Signal | null> {
  try {
    const priceAdapter = getPriceAdapter();
    const newsAdapter = new NewsApiAdapter();
    const nowUnix = Math.floor(Date.now() / 1000);
    const newsFromUnix = nowUnix - 24 * 3600;

    const quote = await priceAdapter.getQuote(symbol);
    await sleep(300);
    const candles = await getDailyCandles(symbol, 90);
    await sleep(300);
    const rawNews = await newsAdapter.getNewsForSymbol(symbol, newsFromUnix);

    if (candles.length < 35) return null;

    const technicals = buildTechnicalSnapshot(symbol, candles);
    const { items: scoredNews, compositeScore } = scoreNewsBatch(rawNews, nowUnix);

    return generateSignal({
      symbol,
      price: quote.price,
      technicals,
      newsItems: scoredNews,
      compositeSentiment: compositeScore,
    });
  } catch (err: any) {
    console.error(`[/api/scan] ${symbol}:`, err.message);
    return null;
  }
}

export async function GET() {
  const results: Signal[] = [];

  for (const symbol of SCAN_UNIVERSE) {
    const signal = await scanOneSymbol(symbol);
    if (signal) results.push(signal);
    await sleep(300);
  }

  const buys = results
    .filter((s) => s.action === "BUY")
    .sort((a, b) => b.confidence - a.confidence);

  const sells = results
    .filter((s) => s.action === "SELL")
    .sort((a, b) => b.confidence - a.confidence);

  return NextResponse.json({
    scannedAt: Math.floor(Date.now() / 1000),
    totalScanned: SCAN_UNIVERSE.length,
    buys,
    sells,
  });
}
