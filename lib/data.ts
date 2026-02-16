import {
  ProtocolConfig,
  ProtocolMetrics,
  HistoricalDataPoint,
  AnnualSnapshot,
  CoinGeckoMarketData,
  CoinGeckoMarketChart,
  DefiLlamaFees,
  DefiLlamaRevenue,
} from './types'

const DEFILLAMA_BASE = 'https://pro-api.llama.fi'
const COINGECKO_BASE = 'https://pro-api.coingecko.com/api/v3'

const REVALIDATE = 86400 // 24 hours

function llamaUrl(path: string): string {
  const key = process.env.DEFILLAMA_API_KEY || ''
  const sep = path.includes('?') ? '&' : '?'
  return `${DEFILLAMA_BASE}${path}${sep}apikey=${key}`
}

function geckoUrl(path: string): string {
  const key = process.env.COINGECKO_API_KEY || ''
  const sep = path.includes('?') ? '&' : '?'
  return `${COINGECKO_BASE}${path}${sep}x_cg_pro_api_key=${key}`
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE } })
    if (!res.ok) {
      console.error(`API error ${res.status} for ${url.split('?')[0]}`)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.error(`Fetch error for ${url.split('?')[0]}:`, err)
    return null
  }
}

// ── DefiLlama Fetchers ──────────────────────────────────────────────

interface LlamaProtocolResponse {
  id: string
  name: string
  symbol: string
  category: string
  tvl: number
  chainTvls: Record<string, { tvl: { date: number; totalLiquidityUSD: number }[] }>
  currentChainTvls: Record<string, number>
  tvl_list?: { date: number; totalLiquidityUSD: number }[]
  // The main tvl history is directly on the object
}

export async function getDefiLlamaProtocol(slug: string) {
  return safeFetch<LlamaProtocolResponse>(llamaUrl(`/protocol/${slug}`))
}

export async function getDefiLlamaFees(slug: string) {
  return safeFetch<DefiLlamaFees>(llamaUrl(`/summary/fees/${slug}?dataType=dailyFees`))
}

export async function getDefiLlamaRevenue(slug: string) {
  return safeFetch<DefiLlamaRevenue>(llamaUrl(`/summary/fees/${slug}?dataType=dailyRevenue`))
}

export async function getDefiLlamaTreasury(slug: string) {
  return safeFetch<{ tvl: number }>(llamaUrl(`/treasury/${slug}`))
}

// ── CoinGecko Fetchers ──────────────────────────────────────────────

export async function getCoinGeckoMarketData(geckoId: string) {
  return safeFetch<CoinGeckoMarketData>(
    geckoUrl(`/coins/${geckoId}?localization=false&tickers=false&community_data=false&developer_data=false`)
  )
}

export async function getCoinGeckoMarketChart(geckoId: string) {
  return safeFetch<CoinGeckoMarketChart>(
    geckoUrl(`/coins/${geckoId}/market_chart?vs_currency=usd&days=max&interval=daily`)
  )
}

// ── Historical TVL extraction ───────────────────────────────────────

function extractTVLHistory(llamaData: LlamaProtocolResponse | null): { date: number; tvl: number }[] {
  if (!llamaData) return []

  // DefiLlama returns TVL history in chainTvls or as a direct tvl array
  // Try to reconstruct aggregate from chainTvls
  const tvlMap = new Map<number, number>()

  if (llamaData.chainTvls) {
    for (const chain of Object.keys(llamaData.chainTvls)) {
      // Skip DefiLlama aggregate/derived keys (e.g. "Ethereum-staking", "borrowed", "pool2")
      const lc = chain.toLowerCase()
      if (lc === 'borrowed' || lc === 'pool2' || lc === 'staking' || lc.includes('-')) continue
      const chainData = llamaData.chainTvls[chain]
      if (chainData?.tvl) {
        for (const point of chainData.tvl) {
          const existing = tvlMap.get(point.date) || 0
          tvlMap.set(point.date, existing + point.totalLiquidityUSD)
        }
      }
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
  // Fetch all data in parallel
  const [llamaProtocol, llamaFees, llamaRevenue, llamaTreasury, geckoMarket, geckoChart] =
    await Promise.all([
      getDefiLlamaProtocol(config.slug),
      getDefiLlamaFees(config.slug),
      getDefiLlamaRevenue(config.slug),
      getDefiLlamaTreasury(config.slug),
      getCoinGeckoMarketData(config.geckoId),
      getCoinGeckoMarketChart(config.geckoId),
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

  const tvl = llamaProtocol?.tvl ?? null

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
  const priceHistory = geckoChart?.prices ?? []

  // Build merged timeline
  const historicalPrices = buildHistoricalTimeline(priceHistory, tvlHistory)

  // ── Annual Snapshots ────────────────────────────────────────────

  const annualSnapshots = buildAnnualSnapshots(
    priceHistory,
    geckoChart?.market_caps ?? [],
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
  // Use daily price data, merge with TVL
  const tvlMap = new Map<string, number>()
  for (const point of tvlHistory) {
    const dateKey = new Date(point.date * 1000).toISOString().split('T')[0]
    tvlMap.set(dateKey, point.tvl)
  }

  const points: HistoricalDataPoint[] = []
  for (const [timestamp, price] of priceHistory) {
    const dateKey = new Date(timestamp).toISOString().split('T')[0]
    points.push({
      date: Math.floor(timestamp / 1000),
      price,
      tvl: tvlMap.get(dateKey) ?? null,
    })
  }

  return points
}

function buildAnnualSnapshots(
  priceHistory: [number, number][],
  mcapHistory: [number, number][],
  tvlHistory: { date: number; tvl: number }[],
  revenueChart: [number, number][],
  feeChart: [number, number][],
): AnnualSnapshot[] {
  // Group by year
  const years = new Set<number>()
  const currentYear = new Date().getFullYear()

  for (const [ts] of priceHistory) {
    const year = new Date(ts).getFullYear()
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
