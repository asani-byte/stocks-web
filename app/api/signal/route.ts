import { NextRequest, NextResponse } from "next/server";
import { getPriceAdapter } from "@/lib/adapters";
import { NewsApiAdapter } from "@/lib/adapters/newsApiAdapter";
import { getDailyCandles } from "@/lib/adapters/twelveDataAdapter";
import { buildTechnicalSnapshot } from "@/lib/engine/technicals";
import { scoreNewsBatch } from "@/lib/engine/sentiment";
import { generateSignal } from "@/lib/engine/signalEngine";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Missing required query param: symbol" }, { status: 400 });
  }

  const upperSymbol = symbol.toUpperCase();

  try {
    const priceAdapter = getPriceAdapter();
    const newsAdapter = new NewsApiAdapter();

    const nowUnix = Math.floor(Date.now() / 1000);
    const newsFromUnix = nowUnix - 24 * 3600;

    const [quote, candles, rawNews] = await Promise.all([
      priceAdapter.getQuote(upperSymbol),
      getDailyCandles(upperSymbol, 90),
      newsAdapter.getNewsForSymbol(upperSymbol, newsFromUnix),
    ]);

    if (candles.length < 35) {
      return NextResponse.json(
        {
          error: `Insufficient candle history for "${upperSymbol}" to compute indicators (got ${candles.length}, need 35+)`,
        },
        { status: 422 }
      );
    }

    const technicals = buildTechnicalSnapshot(upperSymbol, candles);
    const { items: scoredNews, compositeScore } = scoreNewsBatch(rawNews, nowUnix);

    const signal = generateSignal({
      symbol: upperSymbol,
      price: quote.price,
      technicals,
      newsItems: scoredNews,
      compositeSentiment: compositeScore,
    });

    return NextResponse.json({ signal, quote, technicals, news: scoredNews });
  } catch (err: any) {
    console.error(`[/api/signal] ${upperSymbol}:`, err.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to generate signal" },
      { status: 502 }
    );
  }
}
