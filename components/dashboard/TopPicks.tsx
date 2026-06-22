"use client";

import { useQuery } from "@tanstack/react-query";
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

export function TopPicks() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["scan"],
    queryFn: fetchScan,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <PanelShell>
        <p className="text-sm text-slate-500">Scanning market for opportunities, this can take up to 30 seconds...</p>
      </PanelShell>
    );
  }

  if (error) {
    return (
      <PanelShell>
        <p className="text-sm text-red-400">{(error as Error).message}</p>
      </PanelShell>
    );
  }

  if (!data) return null;

  return (
    <PanelShell>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Top picks
        </h2>
        <span className="text-xs text-slate-500">
          Scanned {data.totalScanned} tickers
        </span>
      </div>

      {data.buys.length === 0 && data.sells.length === 0 && (
        <p className="text-sm text-slate-500">
          No strong signals right now. Check back later.
        </p>
      )}

      {data.buys.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-emerald-400 uppercase tracking-wide mb-2">
            Buy candidates
          </h3>
          <div className="space-y-2">
            {data.buys.map((signal) => (
              <PickRow key={signal.symbol} signal={signal} />
            ))}
          </div>
        </div>
      )}

      {data.sells.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-red-400 uppercase tracking-wide mb-2">
            Sell candidates
          </h3>
          <div className="space-y-2">
            {data.sells.map((signal) => (
              <PickRow key={signal.symbol} signal={signal} />
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-600 leading-relaxed">
        Rules-based scan results, not financial advice. Verify independently before trading.
      </p>
    </PanelShell>
  );
}

function PickRow({ signal }: { signal: Signal }) {
  const badgeColor =
    signal.action === "BUY"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
      <div>
        <span className="font-medium text-slate-200">{signal.symbol}</span>
        <span className="ml-2 text-xs text-slate-500">
          {Math.round(signal.confidence * 100)}% confidence
        </span>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
        {signal.action}
      </span>
    </div>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">{children}</div>
  );
}
