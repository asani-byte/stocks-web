import type { Candle, TechnicalSnapshot } from "@/lib/types";

export function calculateRSI(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) {
    throw new Error(`Need at least ${period + 1} candles to calculate RSI(${period})`);
  }

  const closes = candles.map((c) => c.close);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

export function calculateMACD(
  candles: Candle[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): { macdLine: number; signalLine: number; histogram: number } {
  if (candles.length < slow + signalPeriod) {
    throw new Error(
      `Need at least ${slow + signalPeriod} candles to calculate MACD(${fast},${slow},${signalPeriod})`
    );
  }

  const closes = candles.map((c) => c.close);
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);

  const macdSeries = closes.map((_, i) => fastEma[i] - slowEma[i]);
  const signalSeries = ema(macdSeries, signalPeriod);

  const lastIndex = macdSeries.length - 1;
  const macdLine = macdSeries[lastIndex];
  const signalLine = signalSeries[lastIndex];

  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine,
  };
}

export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) {
    throw new Error(`Need at least ${period + 1} candles to calculate ATR(${period})`);
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

export function buildTechnicalSnapshot(symbol: string, candles: Candle[]): TechnicalSnapshot {
  return {
    symbol,
    rsi14: calculateRSI(candles, 14),
    macd: calculateMACD(candles),
    atr14: calculateATR(candles, 14),
    asOf: candles[candles.length - 1].timestamp,
  };
}
