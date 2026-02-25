import {
  ProtocolConfig,
  ProtocolMetrics,
  HistoricalDataPoint,
  AnnualSnapshot,
  CoinGeckoMarketData,
  DefiLlamaFees,
  DefiLlamaRevenue,
} from './types'

const DEFILLAMA_PRO_BASE = 'https://pro-api.llama.fi'
const DEFILLAMA_FREE_BASE = 'https://api.llama.fi'
const COINGECKO_PRO_BASE = 'https://pro-api.coingecko.com/api/v3'
const COINGECKO_FREE_BASE = 'https://api.coingecko.com/api/v3'
const DEFILLAMA_COINS_BASE = 'https://coins.llama.fi'

const REVALIDATE = 86400 // 24 hours

/**
 * Build DefiLlama URLs (pro + free).
 *
 * Pro API format (per official @defillama/api SDK):
 *   https://pro-api.llama.fi/{KEY}/api{endpoint}
 *
 * Free API:
 *   https://api.llama.fi{endpoint}
 */
function llamaProUrl(path: string): string | null {
  const key = process.env.DEFILLAMA_API_KEY
  if (!key) return null
  return `${DEFILLAMA_PRO_BASE}/${key}/api${path}`
}

function llamaFreeUrl(path: string): string {
  return `${DEFILLAMA_FREE_BASE}${path}`
}

function geckoProUrl(path: string): string | null {
  const key = process.env.COINGECKO_API_KEY
  if (!key) return null
  const sep = path.includes('?') ? '&' : '?'
  return `${COINGECKO_PRO_BASE}${path}${sep}x_cg_pro_api_key=${key}`
}

function geckoFreeUrl(path: string): string {
  const key = process.env.COINGECKO_API_KEY
  const base = `${COINGECKO_FREE_BASE}${path}`
  if (!key) return base
  // Pass the key as a demo API key so the free-tier fallback is authenticated.
  // This also handles the case where the key is a Demo key (not Pro).
  const sep = path.includes('?') ? '&' : '?'
  return `${base}${sep}x_cg_demo_api_key=${key}`
}

/** Strip API keys from URLs before logging. */
function redactUrl(url: string): string {
  const llamaKey = process.env.DEFILLAMA_API_KEY
  const geckoKey = process.env.COINGECKO_API_KEY
  let redacted = url
  if (llamaKey) redacted = redacted.replace(llamaKey, '[KEY]')
  if (geckoKey) redacted = redacted.replace(geckoKey, '[KEY]')
  return redacted
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE } })
    if (!res.ok) {
      console.error(`API error ${res.status} for ${redactUrl(url)}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`Fetch error for ${redactUrl(url)}:`, err)
    return null
  }
}

/**
 * Fetch with automatic fallback: try the primary URL first, then the fallback.
 * This allows pro API → free API degradation so charts still load when the
 * pro key is missing, expired, or rate-limited.
 */
async function safeFetchWithFallback<T>(
  primaryUrl: string | null,
  fallbackUrl: string,
): Promise<T | null> {
  if (primaryUrl) {
    const result = await safeFetch<T>(primaryUrl)
    if (result !== null) return result
    console.warn(`Pro API failed, falling back to free API: ${redactUrl(fallbackUrl)}`)
  }
  return safeFetch<T>(fallbackUrl)
}

// ── DefiLlama Fetchers ──────────────────────────────────────────────

interface DefiLlamaCoinsChartResponse {
  coins: Record<
    string,
    {
      symbol: string
      confidence: number
      prices: { timestamp: number; price: number }[]
    }
  >
}

interface LlamaProtocolResponse {
  id: string
  name: string
  symbol: string
  category: string
  // /protocol/{slug} returns tvl as a historical array, NOT a number.
  // Use currentChainTvls for the current aggregate TVL.
  tvl: { date: number; totalLiquidityUSD: number }[]
  chainTvls: Record<string, { tvl: { date: number; totalLiquidityUSD: number }[] }>
  currentChainTvls: Record<string, number>
}

export async function getDefiLlamaProtocol(slug: string) {
  const path = `/protocol/${slug}`
  return safeFetchWithFallback<LlamaProtocolResponse>(llamaProUrl(path), llamaFreeUrl(path))
}

export async function getDefiLlamaFees(slug: string) {
  const path = `/summary/fees/${slug}?dataType=dailyFees`
  return safeFetchWithFallback<DefiLlamaFees>(llamaProUrl(path), llamaFreeUrl(path))
}

export async function getDefiLlamaRevenue(slug: string) {
  const path = `/summary/fees/${slug}?dataType=dailyRevenue`
  return safeFetchWithFallback<DefiLlamaRevenue>(llamaProUrl(path), llamaFreeUrl(path))
}

export async function getDefiLlamaTreasury(slug: string) {
  const path = `/treasury/${slug}`
  return safeFetchWithFallback<{ tvl: number }>(llamaProUrl(path), llamaFreeUrl(path))
}

// ── CoinGecko Fetchers ──────────────────────────────────────────────

export async function getCoinGeckoMarketData(geckoId: string) {
  const path = `/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`
  return safeFetchWithFallback<CoinGeckoMarketData>(geckoProUrl(path), geckoFreeUrl(path))
}

// ── DefiLlama Coins (Historical Prices) ───────────────────────────

async function getDefiLlamaHistoricalPrices(
  geckoId: string,
): Promise<[number, number][]> {
  // DefiLlama provides the full price history (6+ years) without the 2-year cap
  // that CoinGecko imposes. Used as the sole source for the historical price chart.
  const sixYearsAgoMs = new Date(new Date().getFullYear() - 6, 0, 1).getTime()
  const startUnix = Math.floor(sixYearsAgoMs / 1000)
  const url = `${DEFILLAMA_COINS_BASE}/chart/coingecko:${geckoId}?start=${startUnix}&span=24`
  const data = await safeFetch<DefiLlamaCoinsChartResponse>(url)
  const coinKey = `coingecko:${geckoId}`
  const prices = data?.coins?.[coinKey]?.prices
  if (!prices || prices.length === 0) return []
  // Convert to CoinGecko-compatible format: [timestamp_ms, price]
  return prices.map((p) => [p.timestamp * 1000, p.price] as [number, number])
}

// ── TVL helpers ─────────────────────────────────────────────────────

/** Chains / derived keys to exclude when summing TVL. */
function isDerivedChainKey(chain: string): boolean {
  const lc = chain.toLowerCase()
  return lc === 'borrowed' || lc === 'pool2' || lc === 'staking' || lc.includes('-')
}

/**
 * Compute current aggregate TVL from currentChainTvls, filtering out
 * DefiLlama derived categories (borrowed, pool2, staking, chain-specific variants).
 */
function computeCurrentTVL(llamaData: LlamaProtocolResponse | null): number | null {
  if (!llamaData?.currentChainTvls) return null
  let total = 0
  for (const [chain, value] of Object.entries(llamaData.currentChainTvls)) {
    if (isDerivedChainKey(chain)) continue
    total += value
  }
  return total > 0 ? total : null
}

function extractTVLHistory(llamaData: LlamaProtocolResponse | null): { date: number; tvl: number }[] {
  if (!llamaData) return []

  // Try to reconstruct aggregate from per-chain data (allows filtering derived keys)
  const tvlMap = new Map<number, number>()

  if (llamaData.chainTvls) {
    for (const chain of Object.keys(llamaData.chainTvls)) {
      if (isDerivedChainKey(chain)) continue
      const chainData = llamaData.chainTvls[chain]
      if (chainData?.tvl) {
        for (const point of chainData.tvl) {
          const existing = tvlMap.get(point.date) || 0
          tvlMap.set(point.date, existing + point.totalLiquidityUSD)
        }
      }
    }
  }

  // Fall back to top-level tvl array if chainTvls produced nothing
  if (tvlMap.size === 0 && Array.isArray(llamaData.tvl)) {
    for (const point of llamaData.tvl) {
      tvlMap.set(point.date, point.totalLiquidityUSD)
    }
  }

  const entries = Array.from(tvlMap.entries())
    .map(([date, tvl]) => ({ date, tvl }))
    .sort((a, b) => a.date - b.date)

  return entries
}

// ── Build Full Protocol Data ────────────────────────────────────────

export async function getProtocolData(config: ProtocolConfig): Promise<{
  metrics: ProtocolMetrics
  historicalPrices: HistoricalDataPoint[]
  annualSnapshots: AnnualSnapshot[]
}> {
  // Fetch all data in parallel. DefiLlama provides the full price history
  // (6+ years of daily data) — CoinGecko market_chart is not used because
  // it caps history to ~2 years.
  const [llamaProtocol, llamaFees, llamaRevenue, llamaTreasury, geckoMarket, llamaPrices] =
    await Promise.all([
      getDefiLlamaProtocol(config.slug),
      getDefiLlamaFees(config.slug),
      getDefiLlamaRevenue(config.slug),
      getDefiLlamaTreasury(config.slug),
      getCoinGeckoMarketData(config.geckoId),
      getDefiLlamaHistoricalPrices(config.geckoId),
    ])

  // ── Current Metrics ─────────────────────────────────────────────

  const price = geckoMarket?.market_data?.current_price?.usd ?? null
  const marketCap = geckoMarket?.market_data?.market_cap?.usd ?? null
  const fdv = geckoMarket?.market_data?.fully_diluted_valuation?.usd ?? null
  const volume24h = geckoMarket?.market_data?.total_volume?.usd ?? null
  const circulatingSupply = geckoMarket?.market_data?.circulating_supply ?? null
  const totalSupply = geckoMarket?.market_data?.total_supply ?? null
  const percentCirculating =
    circulatingSupply != null && totalSupply != null && totalSupply > 0
      ? (circulatingSupply / totalSupply) * 100
      : null
  const ath = geckoMarket?.market_data?.ath?.usd ?? null
  const athDate = geckoMarket?.market_data?.ath_date?.usd ?? null
  const atl = geckoMarket?.market_data?.atl?.usd ?? null
  const atlDate = geckoMarket?.market_data?.atl_date?.usd ?? null
  const distanceFromATH =
    price != null && ath != null && ath > 0 ? ((price - ath) / ath) * 100 : null

  const tvl = computeCurrentTVL(llamaProtocol)

  // Revenue & fees: annualize from 30d data
  const annualizedRevenue =
    llamaRevenue?.total30d != null ? llamaRevenue.total30d * 12 : null
  const annualizedFees =
    llamaFees?.total30d != null ? llamaFees.total30d * 12 : null

  const treasury = llamaTreasury?.tvl ?? null

  // Derived ratios
  const psRatio =
    marketCap != null && annualizedRevenue != null && annualizedRevenue > 0
      ? marketCap / annualizedRevenue
      : null
  const pfRatio =
    marketCap != null && annualizedFees != null && annualizedFees > 0
      ? marketCap / annualizedFees
      : null
  const tvlMcapRatio =
    tvl != null && marketCap != null && marketCap > 0 ? tvl / marketCap : null
  const fdvRevenue =
    fdv != null && annualizedRevenue != null && annualizedRevenue > 0
      ? fdv / annualizedRevenue
      : null
  const revenueYield =
    annualizedRevenue != null && tvl != null && tvl > 0
      ? (annualizedRevenue / tvl) * 100
      : null
  const feeTvl =
    annualizedFees != null && tvl != null && tvl > 0
      ? (annualizedFees / tvl) * 100
      : null

  // Momentum metrics — compound 30d change to approximate 90d
  const priceChange90d = geckoMarket?.market_data?.price_change_percentage_30d != null
    ? ((Math.pow(1 + geckoMarket.market_data.price_change_percentage_30d / 100, 3) - 1) * 100)
    : null
  const tvlChange90d = computeTvlChange90d(extractTVLHistory(llamaProtocol))
  const revenueChange90d = computeRevenueChange90d(llamaRevenue)

  const metrics: ProtocolMetrics = {
    price,
    marketCap,
    fdv,
    volume24h,
    circulatingSupply,
    totalSupply,
    percentCirculating,
    ath,
    athDate,
    atl,
    atlDate,
    distanceFromATH,
    tvl,
    annualizedRevenue,
    annualizedFees,
    treasury,
    psRatio,
    pfRatio,
    tvlMcapRatio,
    fdvRevenue,
    revenueYield,
    feeTvl,
    priceChange90d,
    tvlChange90d,
    revenueChange90d,
  }

  // ── Historical Data Points ──────────────────────────────────────

  const tvlHistory = extractTVLHistory(llamaProtocol)

  // Use DefiLlama as the sole price history source (6+ years of daily data).
  // CoinGecko market_chart caps history to ~2 years which is insufficient.
  const priceHistory: [number, number][] = llamaPrices

  if (priceHistory.length === 0) {
    console.warn(`No price history available for ${config.geckoId} from DefiLlama`)
  }

  // Estimate market caps from price history and current circulating supply.
  const mcapHistory: [number, number][] =
    circulatingSupply != null && circulatingSupply > 0
      ? estimateMarketCaps(priceHistory, circulatingSupply)
      : []

  // Build merged timeline for the price/TVL chart
  const historicalPrices = buildHistoricalTimeline(priceHistory, tvlHistory)

  // ── Annual Snapshots ────────────────────────────────────────────

  const annualSnapshots = buildAnnualSnapshots(
    priceHistory,
    mcapHistory,
    tvlHistory,
    llamaRevenue?.totalDataChart ?? [],
    llamaFees?.totalDataChart ?? [],
  )

  return { metrics, historicalPrices, annualSnapshots }
}

// ── Helper Functions ────────────────────────────────────────────────

function computeTvlChange90d(tvlHistory: { date: number; tvl: number }[]): number | null {
  if (tvlHistory.length < 2) return null
  const now = tvlHistory[tvlHistory.length - 1]
  const ninetyDaysAgo = now.date - 90 * 86400
  const past = tvlHistory.reduce((closest, point) => {
    return Math.abs(point.date - ninetyDaysAgo) < Math.abs(closest.date - ninetyDaysAgo)
      ? point
      : closest
  }, tvlHistory[0])
  if (past.tvl === 0) return null
  return ((now.tvl - past.tvl) / past.tvl) * 100
}

function computeRevenueChange90d(revenueData: DefiLlamaRevenue | null): number | null {
  if (!revenueData?.totalDataChart || revenueData.totalDataChart.length < 90) return null
  const chart = revenueData.totalDataChart
  const recent30 = chart.slice(-30)
  const prior30 = chart.slice(-90, -60)
  if (prior30.length === 0 || recent30.length === 0) return null
  const recentSum = recent30.reduce((s, [, v]) => s + v, 0)
  const priorSum = prior30.reduce((s, [, v]) => s + v, 0)
  if (priorSum === 0) return null
  return ((recentSum - priorSum) / priorSum) * 100
}

function buildHistoricalTimeline(
  priceHistory: [number, number][],
  tvlHistory: { date: number; tvl: number }[],
): HistoricalDataPoint[] {
  // Merge both data sources by date key so the chart works even when one source is missing.
  // Price timestamps are in milliseconds; TVL timestamps are in seconds.
  const merged = new Map<string, { dateUnix: number; price: number | null; tvl: number | null }>()

  for (const point of tvlHistory) {
    const dateKey = new Date(point.date * 1000).toISOString().split('T')[0]
    const existing = merged.get(dateKey)
    if (existing) {
      existing.tvl = point.tvl
    } else {
      merged.set(dateKey, { dateUnix: point.date, price: null, tvl: point.tvl })
    }
  }

  for (const [timestamp, price] of priceHistory) {
    const dateKey = new Date(timestamp).toISOString().split('T')[0]
    const dateUnix = Math.floor(timestamp / 1000)
    const existing = merged.get(dateKey)
    if (existing) {
      existing.price = price
      existing.dateUnix = dateUnix
    } else {
      merged.set(dateKey, { dateUnix, price, tvl: null })
    }
  }

  return Array.from(merged.values())
    .map((entry) => ({ date: entry.dateUnix, price: entry.price, tvl: entry.tvl }))
    .sort((a, b) => a.date - b.date)
}

/**
 * Estimate historical market caps from price history and current circulating supply.
 * This assumes today's supply applied at all historical dates — an acceptable
 * approximation vs. showing "N/A" for all years.
 */
function estimateMarketCaps(
  priceHistory: [number, number][],
  circulatingSupply: number,
): [number, number][] {
  return priceHistory.map(
    ([ts, price]) => [ts, price * circulatingSupply] as [number, number],
  )
}

function buildAnnualSnapshots(
  priceHistory: [number, number][],
  mcapHistory: [number, number][],
  tvlHistory: { date: number; tvl: number }[],
  revenueChart: [number, number][],
  feeChart: [number, number][],
): AnnualSnapshot[] {
  // Collect years from ALL data sources, not just price history.
  // Price/mcap timestamps are in milliseconds.
  // TVL/revenue/fee timestamps (from DefiLlama) are in seconds.
  const years = new Set<number>()
  const currentYear = new Date().getFullYear()

  for (const [ts] of priceHistory) {
    const year = new Date(ts).getFullYear()
    if (year >= currentYear - 5 && year <= currentYear) years.add(year)
  }

  for (const [ts] of mcapHistory) {
    const year = new Date(ts).getFullYear()
    if (year >= currentYear - 5 && year <= currentYear) years.add(year)
  }

  for (const point of tvlHistory) {
    const year = new Date(point.date * 1000).getFullYear()
    if (year >= currentYear - 5 && year <= currentYear) years.add(year)
  }

  for (const [ts] of revenueChart) {
    const year = new Date(ts * 1000).getFullYear()
    if (year >= currentYear - 5 && year <= currentYear) years.add(year)
  }

  for (const [ts] of feeChart) {
    const year = new Date(ts * 1000).getFullYear()
    if (year >= currentYear - 5 && year <= currentYear) years.add(year)
  }

  const snapshots: AnnualSnapshot[] = []

  for (const year of Array.from(years).sort()) {
    const startMs = new Date(year, 0, 1).getTime()
    const endMs = new Date(year + 1, 0, 1).getTime()
    const startUnix = startMs / 1000
    const endUnix = endMs / 1000

    // Average price
    const yearPrices = priceHistory
      .filter(([ts]) => ts >= startMs && ts < endMs)
      .map(([, p]) => p)
    const avgPrice = yearPrices.length > 0 ? yearPrices.reduce((a, b) => a + b, 0) / yearPrices.length : null

    // Average market cap
    const yearMcaps = mcapHistory
      .filter(([ts]) => ts >= startMs && ts < endMs)
      .map(([, m]) => m)
    const avgMarketCap = yearMcaps.length > 0 ? yearMcaps.reduce((a, b) => a + b, 0) / yearMcaps.length : null

    // Average TVL
    const yearTvl = tvlHistory
      .filter((p) => p.date >= startUnix && p.date < endUnix)
      .map((p) => p.tvl)
    const avgTvl = yearTvl.length > 0 ? yearTvl.reduce((a, b) => a + b, 0) / yearTvl.length : null

    // Total revenue
    const yearRevenue = revenueChart
      .filter(([ts]) => ts >= startUnix && ts < endUnix)
      .map(([, v]) => v)
    const totalRevenue = yearRevenue.length > 0 ? yearRevenue.reduce((a, b) => a + b, 0) : null

    // Total fees
    const yearFees = feeChart
      .filter(([ts]) => ts >= startUnix && ts < endUnix)
      .map(([, v]) => v)
    const totalFees = yearFees.length > 0 ? yearFees.reduce((a, b) => a + b, 0) : null

    // Derived
    const psRatio =
      avgMarketCap != null && totalRevenue != null && totalRevenue > 0
        ? avgMarketCap / totalRevenue
        : null
    const tvlMcapRatio =
      avgTvl != null && avgMarketCap != null && avgMarketCap > 0
        ? avgTvl / avgMarketCap
        : null
    const revenueYield =
      totalRevenue != null && avgTvl != null && avgTvl > 0
        ? (totalRevenue / avgTvl) * 100
        : null

    snapshots.push({
      year,
      avgPrice,
      avgMarketCap,
      avgTvl,
      totalRevenue,
      totalFees,
      psRatio,
      tvlMcapRatio,
      revenueYield,
    })
  }

  return snapshots
}

// ── Fetch All Protocols (for homepage + ratings) ────────────────────

export async function getAllProtocolsData(configs: ProtocolConfig[]) {
  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const data = await getProtocolData(config)
      return { config, ...data }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<{
      config: ProtocolConfig
      metrics: ProtocolMetrics
      historicalPrices: HistoricalDataPoint[]
      annualSnapshots: AnnualSnapshot[]
    }> => r.status === 'fulfilled')
    .map((r) => r.value)
}
