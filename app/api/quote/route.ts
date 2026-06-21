import { NextRequest, NextResponse } from "next/server";
import { getPriceAdapter } from "@/lib/adapters";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Missing required query param: symbol" }, { status: 400 });
  }

  try {
    const adapter = getPriceAdapter();
    const quote = await adapter.getQuote(symbol.toUpperCase());
    return NextResponse.json(quote);
  } catch (err: any) {
    console.error(`[/api/quote] ${symbol}:`, err.message);
    return NextResponse.json(
      { error: err.message ?? "Failed to fetch quote" },
      { status: 502 }
    );
  }
}
