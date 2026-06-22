import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getPriceAdapter } from "@/lib/adapters";
import { NewsApiAdapter } from "@/lib/adapters/newsApiAdapter";
import { getDailyCandles } from "@/lib/adapters/twelveDataAdapter";
import { buildTechnicalSnapshot } from "@/lib/engine/technicals";
import { scoreNewsBatch } from "@/lib/engine/sentiment";
import { generateSignal } from "@/lib/engine/signalEngine";
import { SP500_TICKERS } from "@/lib/sp500";
import type { Signal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SLICE_SIZE = 6;
const TWELVE_DATA_SPACING_MS = 8000;

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
    const candles = await getDailyCandles(symbol, 90);
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

async function saveSignal(signal: Signal): Promise<void> {
  await sql`
    INSERT INTO signals (
      symbol, action, confidence, fused_score, conflicting,
      entry_price, stop_loss, take_profit, risk_reward_ratio,
      volatility_regime, rationale, updated_at
    ) VALUES (
      ${signal.symbol}, ${signal.action}, ${signal.confidence}, ${signal.fusedScore}, ${signal.conflicting},
      ${signal.risk.entryPrice}, ${signal.risk.stopLoss}, ${signal.risk.takeProfit}, ${signal.risk.riskRewardRatio},
      ${signal.risk.volatilityRegime}, ${JSON.stringify(signal.rationale)}, ${signal.generatedAt}
    )
    ON CONFLICT (symbol) DO UPDATE SET
      action = EXCLUDED.action,
      confidence = EXCLUDED.confidence,
      fused_score = EXCLUDED.fused_score,
      conflicting = EXCLUDED.conflicting,
      entry_price = EXCLUDED.entry_price,
      stop_loss = EXCLUDED.stop_loss,
      take_profit = EXCLUDED.take_profit,
      risk_reward_ratio = EXCLUDED.risk_reward_ratio,
      volatility_regime = EXCLUDED.volatility_regime,
      rationale = EXCLUDED.rationale,
      updated_at = EXCLUDED.updated_at;
  `;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progressResult = await sql`SELECT last_index FROM scan_progress WHERE id = 1;`;
  const lastIndex = progressResult.rows[0]?.last_index ?? 0;

  const slice = SP500_TICKERS.slice(lastIndex, lastIndex + SLICE_SIZE);
  const nextIndex = lastIndex + SLICE_SIZE >= SP500_TICKERS.length ? 0 : lastIndex + SLICE_SIZE;

  let savedCount = 0;

  for (const symbol of slice) {
    const signal = await scanOneSymbol(symbol);
    if (signal) {
      await saveSignal(signal);
      savedCount++;
    }
    await sleep(TWELVE_DATA_SPACING_MS);
  }

  await sql`UPDATE scan_progress SET last_index = ${nextIndex} WHERE id = 1;`;

  return NextResponse.json({
    sliceScanned: slice,
    savedCount,
    nextIndex,
    totalTickers: SP500_TICKERS.length,
  });
}
