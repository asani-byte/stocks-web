import type { PriceAdapter } from "@/lib/types";
import { FinnhubAdapter } from "./finnhubAdapter";
import { PolygonAdapter } from "./polygonAdapter";

let cachedAdapter: PriceAdapter | null = null;

export function getPriceAdapter(): PriceAdapter {
  if (cachedAdapter) return cachedAdapter;

  const provider = (process.env.PRICE_PROVIDER || "finnhub").toLowerCase();

  switch (provider) {
    case "polygon":
      cachedAdapter = new PolygonAdapter();
      break;
    case "finnhub":
      cachedAdapter = new FinnhubAdapter();
      break;
    default:
      throw new Error(
        `Unknown PRICE_PROVIDER "${provider}". Use "finnhub" or "polygon".`
      );
  }

  return cachedAdapter;
}
