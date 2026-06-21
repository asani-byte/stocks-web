"use client";

import { useQuote, useSignal } from "@/lib/hooks/useStockData";

export function QuoteHeader({ symbol }: { symbol: string }) {
  const { data: quote, isLoading } = useQuote(symbol);
  const { data: signalData } = useSignal(symbol);

  if (isLoading || !quote) {
    return <div className="h-16 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />;
  }

  const isUp = quote.change >= 0;
  const regime = signalData?.signal.risk.volatilityRegime;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-white">{quote.symbol}</h1>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-medium text-slate-100">
            ${quote.price.toFixed(2)}
          </span>
          <span className={`text-sm font-medium ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {isUp ? "+" : ""}
            {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {(regime === "ELEVATED" || regime === "EXTREME") && (
        <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
          ⚠ Volatility regime: {regime}
        </div>
      )}
    </div>
  );
}
