import type { NewsItem } from "@/lib/types";

const POSITIVE_TERMS: Record<string, number> = {
  beat: 0.6,
  beats: 0.6,
  surge: 0.7,
  surges: 0.7,
  rally: 0.6,
  rallies: 0.6,
  upgrade: 0.6,
  upgraded: 0.6,
  outperform: 0.5,
  bullish: 0.6,
  profit: 0.4,
  growth: 0.4,
  record: 0.4,
  soar: 0.7,
  soars: 0.7,
  gain: 0.4,
  gains: 0.4,
  strong: 0.3,
  raises: 0.4,
};

const NEGATIVE_TERMS: Record<string, number> = {
  miss: -0.6,
  misses: -0.6,
  plunge: -0.7,
  plunges: -0.7,
  crash: -0.8,
  downgrade: -0.6,
  downgraded: -0.6,
  underperform: -0.5,
  bearish: -0.6,
  loss: -0.4,
  losses: -0.4,
  cut: -0.4,
  cuts: -0.4,
  lawsuit: -0.5,
  investigation: -0.5,
  recall: -0.5,
  bankruptcy: -0.9,
  layoffs: -0.5,
  weak: -0.3,
  decline: -0.4,
  declines: -0.4,
  plummet: -0.8,
  plummets: -0.8,
};

export function scoreHeadline(headline: string, summary: string = ""): number {
  const text = `${headline} ${summary}`.toLowerCase();
  const words = text.split(/\W+/);

  let total = 0;
  let matches = 0;

  for (const word of words) {
    if (POSITIVE_TERMS[word] !== undefined) {
      total += POSITIVE_TERMS[word];
      matches++;
    } else if (NEGATIVE_TERMS[word] !== undefined) {
      total += NEGATIVE_TERMS[word];
      matches++;
    }
  }

  if (matches === 0) return 0;
  const score = total / matches;
  return Math.max(-1, Math.min(1, score));
}

export function scoreNewsBatch(
  items: NewsItem[],
  nowUnix: number = Math.floor(Date.now() / 1000),
  halfLifeHours = 12
): { items: NewsItem[]; compositeScore: number } {
  if (items.length === 0) {
    return { items: [], compositeScore: 0 };
  }

  const halfLifeSeconds = halfLifeHours * 3600;
  const decayLambda = Math.LN2 / halfLifeSeconds;

  let weightedSum = 0;
  let weightTotal = 0;

  const scoredItems = items.map((item) => {
    const sentimentScore = scoreHeadline(item.headline, item.summary);
    const ageSeconds = Math.max(0, nowUnix - item.publishedAt);
    const weight = Math.exp(-decayLambda * ageSeconds);

    weightedSum += sentimentScore * weight;
    weightTotal += weight;

    return { ...item, sentimentScore };
  });

  const compositeScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  return { items: scoredItems, compositeScore: Math.max(-1, Math.min(1, compositeScore)) };
}
