"use client";

import { useState } from "react";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { QuoteHeader } from "@/components/dashboard/QuoteHeader";
import { SignalPanel } from "@/components/dashboard/SignalPanel";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { TopPicks } from "@/components/dashboard/TopPicks";

const DEFAULT_WATCHLIST = ["AAPL", "TSLA", "NVDA"];

export default function DashboardPage() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_WATCHLIST);
  const [activeSymbol, setActiveSymbol] = useState<string>(DEFAULT_WATCHLIST[0]);

  function handleAdd(symbol: string) {
    if (!symbols.includes(symbol)) {
      setSymbols((prev) => [...prev, symbol]);
    }
    setActiveSymbol(symbol);
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-3 space-y-5">
          <Watchlist
            symbols={symbols}
            activeSymbol={activeSymbol}
            onSelect={setActiveSymbol}
            onAdd={handleAdd}
          />
          <TopPicks />
        </aside>

        <main className="col-span-9 space-y-5">
          <QuoteHeader symbol={activeSymbol} />

          <div className="grid grid-cols-2 gap-5">
            <SignalPanel symbol={activeSymbol} />
            <NewsFeed symbol={activeSymbol} />
          </div>
        </main>
      </div>
    </div>
  );
}
