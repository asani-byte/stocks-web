"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { QuoteHeader } from "@/components/dashboard/QuoteHeader";
import { SignalPanel } from "@/components/dashboard/SignalPanel";
import { NewsFeed } from "@/components/dashboard/NewsFeed";
import { TopPicks } from "@/components/dashboard/TopPicks";
import type { Signal } from "@/lib/types";

interface ScanResponse {
  scannedAt: number;
  totalScanned: number;
  buys: Signal[];
  sells: Signal[];
}

async function fetchScan(): Promise<ScanResponse> {
  const res = await fetch("/api/scan");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Scan failed");
  }
  return data;
}

const FALLBACK_WATCHLIST = ["AAPL", "TSLA", "NVDA"];

export default function DashboardPage() {
  const [symbols, setSymbols] = useState<string[]>(FALLBACK_WATCHLIST);
  const [activeSymbol, setActiveSymbol] = useState<string>(FALLBACK_WATCHLIST[0]);
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);

  const { data: scanData } = useQuery({
    queryKey: ["scan"],
    queryFn: fetchScan,
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (hasAutoPopulated || !scanData) return;

    const scannedSymbols = [
      ...scanData.buys.map((s) => s.symbol),
      ...scanData.sells.map((s) => s.symbol),
    ];

    if (scannedSymbols.length > 0) {
      setSymbols(scannedSymbols);
      setActiveSymbol(scannedSymbols[0]);
      setHasAutoPopulated(true);
    }
  }, [scanData, hasAutoPopulated]);

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
