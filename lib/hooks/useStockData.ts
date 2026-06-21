"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsItem, Quote, Signal, TechnicalSnapshot } from "@/lib/types";

interface SignalResponse {
  signal: Signal;
  quote: Quote;
  technicals: TechnicalSnapshot;
  news: NewsItem[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `Request to ${url} failed`);
  }
  return data as T;
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => fetchJson<Quote>(`/api/quote?symbol=${symbol}`),
    enabled: Boolean(symbol),
  });
}

export function useSignal(symbol: string) {
  return useQuery({
    queryKey: ["signal", symbol],
    queryFn: () => fetchJson<SignalResponse>(`/api/signal?symbol=${symbol}`),
    enabled: Boolean(symbol),
    refetchInterval: 60_000,
  });
}
