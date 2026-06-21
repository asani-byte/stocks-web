# Stock Signal Dashboard

A standalone web app for real-time stock tracking, news-sentiment analysis, and
rules-based Buy/Sell/Hold signal generation with volatility-aware risk
recommendations (stop-loss / take-profit).

**This tool generates rules-based decision-support output, not financial
advice.** Verify independently before making any trading decision.

## Setup

1. Get a free Finnhub API key: https://finnhub.io/register
2. Copy `.env.example` to `.env.local` and fill in your key
3. `npm install`
4. `npm run dev`
5. Visit `http://localhost:3000`

## Deploying

Deploys cleanly to Vercel:

1. Push this repo to GitHub
2. Import it at https://vercel.com/new
3. Add `PRICE_PROVIDER=finnhub` and `FINNHUB_API_KEY` as environment variables in Vercel project settings
4. Deploy

## Architecture

- `app/api/*` — server-side routes (BFF pattern), keep API keys off the client
- `lib/adapters/*` — swappable price/news provider integrations
- `lib/engine/*` — RSI/MACD/ATR technical indicators, sentiment scoring, and the signal fusion logic
- `components/dashboard/*` — UI components
- `lib/engine/__tests__/*` — unit tests for the signal engine
