# Parabolic Value

DeFi protocol fundamentals presented in the classic Value Line Investment Survey tearsheet format.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (retro black-and-white aesthetic)
- **Charts:** Recharts
- **Data:** DefiLlama Pro API + CoinGecko Pro API
- **Deployment:** Vercel

## Getting Started

```bash
npm install
npm run dev
```

Set environment variables:

```
DEFILLAMA_API_KEY=your_key
COINGECKO_API_KEY=your_key
```

## Architecture

- `/app` - Next.js App Router pages (homepage + per-protocol tearsheets)
- `/components` - Tearsheet UI components (Header, PriceChart, RatingsBox, KeyStats, etc.)
- `/lib` - Data fetching, protocol config, ratings algorithms, projections, formatters
