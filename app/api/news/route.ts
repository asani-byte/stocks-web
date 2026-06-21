import { NextRequest, NextResponse } from "next/server";
import { NewsApiAdapter } from "@/lib/adapters/newsApiAdapter";
import { scoreNewsBatch } from "@/lib/engine/sentiment";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const hours = Number(request.nextUrl.searchParams.get("hours") ?? "24");

  if (!symbol) {
    return NextResponse.json({ error: "Missing required query param: symbol" }, { status: 400 });
  }

  try {
    const adapter = new NewsApiAdapter();
    const nowUnix = Math.floor(Date.now() / 1000);
    const fromUnix = nowUnix - hours * 3600;

    const rawNews = await adapter.getNewsForSymbol(symbol.toUpperCase(), fromUnix);
    const { items, compositeScore } = scoreNewsBatch(rawNews, nowUnix);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      compositeScore,
      items,
    });
  } catch (err: any) {
    console.error(`[/api/news] ${symbol}:`, err.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to fetch news" },
      { status: 502 }
    );
  }
}
