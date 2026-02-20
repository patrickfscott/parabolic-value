// ── Protocol Configuration ──────────────────────────────────────────

export interface ProtocolConfig {
  name: string
  slug: string          // DefiLlama slug
  geckoId: string       // CoinGecko ID
  ticker: string        // Token ticker symbol
  category: string      // e.g., "DEX", "Lending", "Liquid Staking"
  chain: string         // Primary chain
  description: string   // One-line description
}

// ── Raw API Response Types ──────────────────────────────────────────

export interface DefiLlamaProtocol {
  id: string
  name: string
  symbol: string
  category: string
  chains: string[]
  tvl: number
  chainTvls: Record<string, number>
  currentChainTvls: Record<string, number>
  tvlList?: { date: number; totalLiquidityUSD: number }[]
  // Historical TVL is in the main response
}

export interface DefiLlamaHistoricalTVL {
  date: number
  totalLiquidityUSD: number
}

export interface DefiLlamaFees {
  total24h: number | null
  total48hto24h: number | null
  total7d: number | null
  total30d: number | null
  totalAllTime: number | null
  totalDataChart: [number, number][]
  totalDataChartBreakdown?: Record<string, [number, number][]>
}

export interface DefiLlamaRevenue {
  total24h: number | null
  total48hto24h: number | null
  total7d: number | null
  total30d: number | null
  totalAllTime: number | null
  totalDataChart: [number, number][]
}

export interface DefiLlamaTreasury {
  tvl: number
  tokenBreakdowns: Record<string, unknown>
}

export interface CoinGeckoMarketData {
  id: string
  symbol: string
  name: string
  market_data: {
    current_price: { usd: number }
    market_cap: { usd: number }
    fully_diluted_valuation: { usd: number }
    total_volume: { usd: number }
    circulating_supply: number
    total_supply: number | null
    max_supply: number | null
    ath: { usd: number }
    ath_date: { usd: string }
    atl: { usd: number }
    atl_date: { usd: string }
    price_change_percentage_24h: number | null
    price_change_percentage_7d: number | null
    price_change_percentage_30d: number | null
    price_change_percentage_1y: number | null
  }
}

export interface CoinGeckoMarketChart {
  prices: [number, number][]
  market_caps: [number, number][]
  total_volumes: [number, number][]
}

// ── Processed / Computed Types ──────────────────────────────────────

export interface ProtocolMetrics {
  // Price & Market Data
  price: number | null
  marketCap: number | null
  fdv: number | null
  volume24h: number | null
  circulatingSupply: number | null
  totalSupply: number | null
  percentCirculating: number | null
  ath: number | null
  athDate: string | null
  atl: number | null
  atlDate: string | null
  distanceFromATH: number | null

  // DeFi Metrics
  tvl: number | null
  annualizedRevenue: number | null
  annualizedFees: number | null
  treasury: number | null

  // Derived Ratios
  psRatio: number | null
  pfRatio: number | null
  tvlMcapRatio: number | null
  fdvRevenue: number | null
  revenueYield: number | null
  feeTvl: number | null

  // Momentum (for ratings)
  priceChange90d: number | null
  tvlChange90d: number | null
  revenueChange90d: number | null
}

export interface HistoricalDataPoint {
  date: number // unix timestamp
  price: number | null
  tvl: number | null
}

export interface AnnualSnapshot {
  year: number
  avgPrice: number | null
  avgMarketCap: number | null
  avgTvl: number | null
  totalRevenue: number | null
  totalFees: number | null
  psRatio: number | null
  tvlMcapRatio: number | null
  revenueYield: number | null
}

export interface ProtocolRatings {
  timeliness: number // 1-5 (1 = best)
  safety: number     // 1-5 (1 = best)
  technical: number  // 1-5 (1 = best)
}

export interface RatingRawScores {
  slug: string
  timelinessScore: number
  safetyScore: number
  technicalScore: number
}

export interface ProjectionScenario {
  label: string
  revenue1y: number | null
  ps1y: number | null
  impliedPrice1y: number | null
  revenue3y: number | null
  ps3y: number | null
  impliedPrice3y: number | null
}

export interface ProtocolProjections {
  base: ProjectionScenario
  bull: ProjectionScenario
  bear: ProjectionScenario
}

// ── Full Protocol Data Bundle ───────────────────────────────────────

export interface ProtocolData {
  config: ProtocolConfig
  metrics: ProtocolMetrics
  historicalPrices: HistoricalDataPoint[]
  annualSnapshots: AnnualSnapshot[]
  ratings: ProtocolRatings | null
  projections: ProtocolProjections | null
}
