import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await sql`
    SELECT symbol, action, confidence, fused_score, conflicting,
           entry_price, stop_loss, take_profit, risk_reward_ratio,
           volatility_regime, rationale, updated_at
    FROM signals
    WHERE action IN ('BUY', 'SELL')
    ORDER BY confidence DESC
    LIMIT 50;
  `;

  const signals = result.rows.map((row) => ({
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
  }));

  const buys = signals.filter((s) => s.action === "BUY");
  const sells = signals.filter((s) => s.action === "SELL");

  return NextResponse.json({
    fetchedAt: Math.floor(Date.now() / 1000),
    buys,
    sells,
  });
}
