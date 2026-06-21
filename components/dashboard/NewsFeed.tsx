"use client";

import { useSignal } from "@/lib/hooks/useStockData";

function sentimentBadge(score: number | undefined) {
  if (score === undefined) return { icon: "⚪", color: "text-slate-400" };
  if (score > 0.15) return { icon: "🟢", color: "text-emerald-400" };
  if (score < -0.15) return { icon: "🔴", color: "text-red-400" };
  return { icon: "⚪", color: "text-slate-400" };
}

export function NewsFeed({ symbol }: { symbol: string }) {
  const { data, isLoading } = useSignal(symbol);

  if (isLoading) {
    return <PanelShell><p className="text-sm text-slate-500">Loading news...</p></PanelShell>;
  }

  if (!data || data.news.length === 0) {
    return (
      <PanelShell>
        <p className="text-sm text-slate-500">No recent news found for {symbol}.</p>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
        News Feed
      </h2>
      <ul className="space-y-3 max-h-96 overflow-y-auto">
        {data.news.map((item) => {
          const badge = sentimentBadge(item.sentimentScore);
          return (
            <li key={item.id} className="border-b border-slate-800 pb-3 last:border-0">
              
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 hover:text-white transition-colors"
              >
                <span>{badge.icon}</span>
                <div>
                  <p className="text-sm text-slate-200">{item.headline}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{item.source}</span>
                    <span className={badge.color}>
                      {item.sentimentScore?.toFixed(2) ?? "—"}
                    </span>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">{children}</div>
  );
}
