import type {
  NewsItem,
  RiskRecommendation,
  Signal,
  SignalAction,
  TechnicalSnapshot,
} from "@/lib/types";

const WEIGHTS = {
  technical: 0.6,
  sentiment: 0.4,
};

const THRESHOLDS = {
  buy: 0.5,
  sell: -0.5,
};

function technicalScoreFrom(snapshot: TechnicalSnapshot): number {
  const rsiScore = clamp(((50 - snapshot.rsi14) / 20) * 0.5, -1, 1);
  const macdScore = Math.tanh(snapshot.macd.histogram);
  return clamp((rsiScore + macdScore) / 2, -1, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function classifyVolatility(atr: number, price: number): RiskRecommendation["volatilityRegime"] {
  const atrPct = atr / price;
  if (atrPct >= 0.06) return "EXTREME";
  if (atrPct >= 0.03) return "ELEVATED";
  if (atrPct >= 0.015) return "NORMAL";
  return "LOW";
}

function buildRiskRecommendation(
  action: SignalAction,
  price: number,
  atr: number
): RiskRecommendation {
  const regime = classifyVolatility(atr, price);

  const stopMultiplierByRegime: Record<RiskRecommendation["volatilityRegime"], number> = {
    LOW: 2.5,
    NORMAL: 2.0,
    ELEVATED: 1.5,
    EXTREME: 1.0,
  };

  const rewardRatioByRegime: Record<RiskRecommendation["volatilityRegime"], number> = {
    LOW: 2.5,
    NORMAL: 2.0,
    ELEVATED: 2.0,
    EXTREME: 1.5,
  };

  const stopMultiplier = stopMultiplierByRegime[regime];
  const riskRewardRatio = rewardRatioByRegime[regime];
  const stopDistance = atr * stopMultiplier;

  let stopLoss: number;
  let takeProfit: number;

  if (action === "BUY") {
    stopLoss = price - stopDistance;
    takeProfit = price + stopDistance * riskRewardRatio;
  } else if (action === "SELL") {
    stopLoss = price + stopDistance;
    takeProfit = price - stopDistance * riskRewardRatio;
  } else {
    stopLoss = price - atr * 2;
    takeProfit = price + atr * 2 * 2;
  }

  return {
    entryPrice: price,
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    riskRewardRatio,
    volatilityRegime: regime,
  };
}

export interface SignalEngineInput {
  symbol: string;
  price: number;
  technicals: TechnicalSnapshot;
  newsItems: NewsItem[];
  compositeSentiment: number;
}

export function generateSignal(input: SignalEngineInput): Signal {
  const { symbol, price, technicals, compositeSentiment } = input;

  const technicalScore = technicalScoreFrom(technicals);
  const sentimentScore = compositeSentiment;

  const fusedScore =
    WEIGHTS.technical * technicalScore + WEIGHTS.sentiment * sentimentScore;

  const directionsDisagree =
    Math.sign(technicalScore) !== Math.sign(sentimentScore) &&
    Math.abs(technicalScore) > 0.2 &&
    Math.abs(sentimentScore) > 0.2;

  let action: SignalAction = "HOLD";
  if (!directionsDisagree) {
    if (fusedScore > THRESHOLDS.buy) action = "BUY";
    else if (fusedScore < THRESHOLDS.sell) action = "SELL";
  }

  const agreement = 1 - Math.abs(technicalScore - sentimentScore) / 2;
  const magnitude = Math.abs(fusedScore);
  let confidence = clamp(agreement * 0.5 + magnitude * 0.5, 0, 1);
  if (directionsDisagree) confidence = Math.min(confidence, 0.3);

  const risk = buildRiskRecommendation(action, price, technicals.atr14);

  const rationale: string[] = [];
  rationale.push(
    `RSI(14) = ${technicals.rsi14.toFixed(1)} → ${
      technicals.rsi14 < 30 ? "oversold" : technicals.rsi14 > 70 ? "overbought" : "neutral"
    }`
  );
  rationale.push(
    `MACD histogram = ${technicals.macd.histogram.toFixed(3)} → ${
      technicals.macd.histogram > 0 ? "bullish momentum" : "bearish momentum"
    }`
  );
  rationale.push(
    `News sentiment composite = ${sentimentScore.toFixed(2)} from ${input.newsItems.length} articles`
  );
  if (directionsDisagree) {
    rationale.push("⚠ Technical and sentiment signals disagree — confidence suppressed to HOLD");
  }
  rationale.push(`Volatility regime: ${risk.volatilityRegime} (ATR ${technicals.atr14.toFixed(2)})`);

  return {
    symbol,
    action,
    confidence,
    technicalScore,
    sentimentScore,
    fusedScore,
    conflicting: directionsDisagree,
    risk,
    generatedAt: Math.floor(Date.now() / 1000),
    rationale,
  };
}
