import { describe, expect, it } from "vitest";
import { generateSignal } from "@/lib/engine/signalEngine";
import type { TechnicalSnapshot } from "@/lib/types";

function makeTechnicals(overrides: Partial<TechnicalSnapshot> = {}): TechnicalSnapshot {
  return {
    symbol: "TEST",
    rsi14: 50,
    macd: { macdLine: 0, signalLine: 0, histogram: 0 },
    atr14: 2,
    asOf: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe("generateSignal", () => {
  it("produces BUY when technicals and sentiment both strongly agree bullish", () => {
    const signal = generateSignal({
      symbol: "TEST",
      price: 100,
      technicals: makeTechnicals({
        rsi14: 25,
        macd: { macdLine: 1.5, signalLine: 0.5, histogram: 1.0 },
      }),
      newsItems: [],
      compositeSentiment: 0.8,
    });

    expect(signal.action).toBe("BUY");
    expect(signal.conflicting).toBe(false);
    expect(signal.confidence).toBeGreaterThan(0.5);
  });

  it("produces SELL when technicals and sentiment both strongly agree bearish", () => {
    const signal = generateSignal({
      symbol: "TEST",
      price: 100,
      technicals: makeTechnicals({
        rsi14: 78,
        macd: { macdLine: -1.5, signalLine: -0.5, histogram: -1.0 },
      }),
      newsItems: [],
      compositeSentiment: -0.8,
    });

    expect(signal.action).toBe("SELL");
    expect(signal.conflicting).toBe(false);
  });

  it("suppresses to HOLD when technical and sentiment direction conflict", () => {
    const signal = generateSignal({
      symbol: "TEST",
      price: 100,
      technicals: makeTechnicals({
        rsi14: 20,
        macd: { macdLine: 2, signalLine: 0.5, histogram: 1.5 },
      }),
      newsItems: [],
      compositeSentiment: -0.9,
    });

    expect(signal.action).toBe("HOLD");
    expect(signal.conflicting).toBe(true);
    expect(signal.confidence).toBeLessThanOrEqual(0.3);
  });

  it("tightens stop-loss multiplier as volatility regime increases", () => {
    const lowVol = generateSignal({
      symbol: "TEST",
      price: 100,
      technicals: makeTechnicals({ atr14: 0.5 }),
      newsItems: [],
      compositeSentiment: 0,
    });

    const extremeVol = generateSignal({
      symbol: "TEST",
      price: 100,
      technicals: makeTechnicals({ atr14: 8 }),
      newsItems: [],
      compositeSentiment: 0,
    });

    expect(lowVol.risk.volatilityRegime).toBe("LOW");
    expect(extremeVol.risk.volatilityRegime).toBe("EXTREME");
    expect(extremeVol.risk.riskRewardRatio).toBeLessThan(lowVol.risk.riskRewardRatio);
  });

  it("inverts stop/target placement correctly for SELL vs BUY", () => {
    const buySignal = generateSignal({
      symbol: "TEST",
      price: 100,
      technicals: makeTechnicals({
        rsi14: 20,
        macd: { macdLine: 2, signalLine: 0.5, histogram: 1.5 },
      }),
      newsItems: [],
      compositeSentiment: 0.8,
    });

    expect(buySignal.action).toBe("BUY");
    expect(buySignal.risk.stopLoss).toBeLessThan(buySignal.risk.entryPrice);
    expect(buySignal.risk.takeProfit).toBeGreaterThan(buySignal.risk.entryPrice);

    const sellSignal = generateSignal({
      symbol: "TEST",
      price: 100,
      technicals: makeTechnicals({
        rsi14: 80,
        macd: { macdLine: -2, signalLine: -0.5, histogram: -1.5 },
      }),
      newsItems: [],
      compositeSentiment: -0.8,
    });

    expect(sellSignal.action).toBe("SELL");
    expect(sellSignal.risk.stopLoss).toBeGreaterThan(sellSignal.risk.entryPrice);
    expect(sellSignal.risk.takeProfit).toBeLessThan(sellSignal.risk.entryPrice);
  });
});
