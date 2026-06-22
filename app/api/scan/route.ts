import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getPriceAdapter } from "@/lib/adapters";
import { NewsApiAdapter } from "@/lib/adapters/newsApiAdapter";
import { getDailyCandles } from "@/lib/adapters/twelveDataAdapter";
import { buildTechnicalSnapshot } from "@/lib/engine/technicals";
import { scoreNewsBatch } from "@/lib/engine/sentiment";
import { generateSignal } from "@/lib/engine/signalEngine";

const CACHE_TTL_SECONDS = 10 * 60;

async function getCachedSignal(symbol: string) {
  const result = await sql`
    SELECT symbol, action, confidence, fused_score, conflicting,
           entry_price, stop_loss, take_profit, risk_reward_ratio,
           volatility_regime, rationale, updated_at
    FROM signals
    WHERE symbol = ${symbol};
  `;

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const nowUnix = Math.floor(Date.now() / 1000);
  const ageSeconds = nowUnix - Number(row.updated_at);

  if (ageSeconds > CACHE_TTL_SECONDS) return null;

  return {
    symbol: row.symbol,
    action: row.action,
    confidence: row.confidence,
    fusedScore: row.fused_score,
    conflicting: row.conflicting,
    risk: {
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      riskRewardRatio: row.risk_reward_ratio,
      volatilityRegime: row.volatility_regime,
    },
    rationale: JSON.parse(row.rationale),
    generatedAt: Number(row.updated_at),
  };
}

async function saveSignalToCache(signal: any) {
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
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Missing required query param: symbol" }, { status: 400 });
  }

  const upperSymbol = symbol.toUpperCase();

  try {
    const cached = await getCachedSignal(upperSymbol);
    const priceAdapter = getPriceAdapter();
    const quote = await priceAdapter.getQuote(upperSymbol);

    if (cached) {
      return NextResponse.json({
        signal: cached,
        quote,
        technicals: null,
        news: [],
        fromCache: true,
      });
    }

    const newsAdapter = new NewsApiAdapter();
    const nowUnix = Math.floor(Date.now() / 1000);
    const newsFromUnix = nowUnix - 24 * 3600;

    const [candles, rawNews] = await Promise.all([
      getDailyCandles(upperSymbol, 90),
      newsAdapter.getNewsForSymbol(upperSymbol, newsFromUnix),
    ]);

    if (candles.length < 35) {
      return NextResponse.json(
        {
          error: `Insufficient candle history for "${upperSymbol}" to compute indicators (got ${candles.length}, need 35+)`,
        },
        { status: 422 }
      );
    }

    const technicals = buildTechnicalSnapshot(upperSymbol, candles);
    const { items: scoredNews, compositeScore } = scoreNewsBatch(rawNews, nowUnix);

    const signal = generateSignal({
      symbol: upperSymbol,
      price: quote.price,
      technicals,
      newsItems: scoredNews,
      compositeSentiment: compositeScore,
    });

    await saveSignalToCache(signal);

    return NextResponse.json({ signal, quote, technicals, news: scoredNews, fromCache: false });
  } catch (err: any) {
    console.error(`[/api/signal] ${upperSymbol}:`, err.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to generate signal" },
      { status: 502 }
    );
  }
}
