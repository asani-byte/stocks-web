import type { NewsAdapter, NewsItem } from "@/lib/types";

const BASE_URL = "https://finnhub.io/api/v1";

function requireApiKey(): string {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error(
      "FINNHUB_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  return key;
}

export class NewsApiAdapter implements NewsAdapter {
  async getNewsForSymbol(symbol: string, fromUnix: number): Promise<NewsItem[]> {
    const key = requireApiKey();
    const fromDate = new Date(fromUnix * 1000).toISOString().split("T")[0];
    const toDate = new Date().toISOString().split("T")[0];

    const params = new URLSearchParams({
      symbol,
      from: fromDate,
      to: toDate,
      token: key,
    });

    const res = await fetch(`${BASE_URL}/company-news?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Finnhub news request failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((article: any, i: number) => ({
      id: `${symbol}-${article.datetime}-${i}`,
      symbol,
      headline: article.headline,
      summary: article.summary ?? "",
      source: article.source ?? "Unknown",
      url: article.url,
      publishedAt: article.datetime,
    }));
  }
}
