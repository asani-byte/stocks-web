"use client";

import { useSignal } from "@/lib/hooks/useStockData";

const ACTION_DOT: Record<string, string> = {
  BUY: "bg-emerald-400",
  SELL: "bg-red-400",
  HOLD: "bg-slate-400",
};

function WatchlistRow({
  symbol,
  active,
  onSelect,
}: {
  symbol: string;
  active: boolean;
  onSelect: (symbol: string) => void;
}) {
  const { data } = useSignal(symbol);
  const action = data?.signal.action ?? "HOLD";

  return (
    <button
      onClick={() => onSelect(symbol)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900"
      }`}
    >
      <span className="font-medium">{symbol}</span>
      <span className="flex items-center gap-1.5 text-xs">
        <span className={`w-2 h-2 rounded-full ${ACTION_DOT[action]}`} />
        {action}
      </span>
    </button>
  );
}

export function Watchlist({
  symbols,
  activeSymbol,
  onSelect,
  onAdd,
}: {
  symbols: string[];
  activeSymbol: string;
  onSelect: (symbol: string) => void;
  onAdd: (symbol: string) => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
        Watchlist
      </h2>
      <div className="space-y-1">
        {symbols.map((symbol) => (
          <WatchlistRow
            key={symbol}
            symbol={symbol}
            active={symbol === activeSymbol}
            onSelect={onSelect}
          />
        ))}
      </div>
      <AddTickerForm onAdd={onAdd} />
    </div>
  );
}

function AddTickerForm({ onAdd }: { onAdd: (symbol: string) => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem("ticker") as HTMLInputElement;
        const value = input.value.trim().toUpperCase();
        if (value) {
          onAdd(value);
          input.value = "";
        }
      }}
      className="mt-3 pt-3 border-t border-slate-800"
    >
      <input
        name="ticker"
        placeholder="+ Add ticker"
        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
      />
    </form>
  );
}
