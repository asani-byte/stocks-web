export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  sentimentScore?: number;
}

export interface TechnicalSnapshot {
  symbol: string;
  rsi14: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  atr14: number;
  asOf: number;
}

export type SignalAction = "BUY" | "SELL" | "HOLD";

export interface RiskRecommendation {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  volatilityRegime: "LOW" | "NORMAL" | "ELEVATED" | "EXTREME";
}

export interface Signal {
  symbol: string;
  action: SignalAction;
  confidence: number;
  technicalScore: number;
  sentimentScore: number;
  fusedScore: number;
  conflicting: boolean;
  risk: RiskRecommendation;
  generatedAt: number;
  rationale: string[];
}

export interface PriceAdapter {
  getQuote(symbol: string): Promise<Quote>;
  getCandles(symbol: string, resolution: string, from: number, to: number): Promise<Candle[]>;
}

export interface NewsAdapter {
  getNewsForSymbol(symbol: string, fromUnix: number): Promise<NewsItem[]>;
}
