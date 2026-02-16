import { ProtocolMetrics, ProtocolRatings, RatingRawScores } from './types'

/**
 * Compute raw rating scores for a single protocol.
 * These are continuous values — higher = better.
 * They will be quintile-ranked across the full universe later.
 */
export function computeRawScores(
  slug: string,
  metrics: ProtocolMetrics,
): RatingRawScores {
  return {
    slug,
    timelinessScore: computeTimelinessRaw(metrics),
    safetyScore: computeSafetyRaw(metrics),
    technicalScore: computeTechnicalRaw(metrics),
  }
}

/**
 * Timeliness: momentum/trend signal — "is now a good time?"
 * 30% price momentum, 30% TVL growth, 25% revenue growth, 15% ATH proximity
 */
function computeTimelinessRaw(metrics: ProtocolMetrics): number {
  const priceMomentum = normalizeScore(metrics.priceChange90d, -50, 100)
  const tvlGrowth = normalizeScore(metrics.tvlChange90d, -50, 100)
  const revenueGrowth = normalizeScore(metrics.revenueChange90d, -50, 200)
  // ATH proximity: 0% = at ATH (best), -90% = far from ATH (worst)
  const athProximity = normalizeScore(
    metrics.distanceFromATH != null ? metrics.distanceFromATH : -100,
    -95,
    0,
  )

  return (
    0.30 * priceMomentum +
    0.30 * tvlGrowth +
    0.25 * revenueGrowth +
    0.15 * athProximity
  )
}

/**
 * Safety: risk/stability signal
 * 25% TVL size, 25% TVL stability (inverse volatility proxy), 20% age (proxy: has historical data),
 * 20% revenue consistency, 10% market cap
 */
function computeSafetyRaw(metrics: ProtocolMetrics): number {
  // TVL size: larger = safer. Log scale.
  const tvlSize = metrics.tvl != null && metrics.tvl > 0
    ? normalizeScore(Math.log10(metrics.tvl), 6, 11)  // $1M to $100B range
    : 0

  // Market cap magnitude
  const mcapSize = metrics.marketCap != null && metrics.marketCap > 0
    ? normalizeScore(Math.log10(metrics.marketCap), 6, 11)
    : 0

  // TVL stability: low change = stable = good
  const tvlStability = metrics.tvlChange90d != null
    ? normalizeScore(-Math.abs(metrics.tvlChange90d), -100, 0)
    : 0.5

  // Revenue consistency: low revenue volatility proxy
  // Use presence and magnitude of revenue as a proxy
  const revenueConsistency = metrics.annualizedRevenue != null && metrics.annualizedRevenue > 0
    ? normalizeScore(Math.log10(metrics.annualizedRevenue), 4, 10)
    : 0

  // Age proxy: if we have data, that's good. More of a constant here.
  const ageProxy = metrics.tvl != null ? 0.7 : 0.3

  return (
    0.25 * tvlSize +
    0.25 * tvlStability +
    0.20 * ageProxy +
    0.20 * revenueConsistency +
    0.10 * mcapSize
  )
}

/**
 * Technical: price action signal
 * 30% price vs short-term trend, 30% price vs long-term trend,
 * 20% low volatility, 20% RSI mean-reversion signal
 *
 * Since we don't have moving average data in metrics, we use available momentum data
 * as a proxy for technical signals.
 */
function computeTechnicalRaw(metrics: ProtocolMetrics): number {
  // Price momentum as proxy for MA crossover signals
  const shortTermTrend = normalizeScore(metrics.priceChange90d, -60, 60)

  // Distance from ATH as long-term trend proxy
  const longTermTrend = normalizeScore(
    metrics.distanceFromATH ?? -50,
    -90,
    0,
  )

  // Low volatility (proxy: smaller absolute price change = less volatile)
  const volatility = metrics.priceChange90d != null
    ? normalizeScore(-Math.abs(metrics.priceChange90d), -100, 0)
    : 0.5

  // RSI-like mean reversion: extreme negatives suggest oversold (potentially bullish)
  // moderate positives are fine, extreme positives suggest overbought
  const rsiSignal = metrics.priceChange90d != null
    ? computeRsiSignal(metrics.priceChange90d)
    : 0.5

  return (
    0.30 * shortTermTrend +
    0.30 * longTermTrend +
    0.20 * volatility +
    0.20 * rsiSignal
  )
}

/**
 * RSI-like signal: score peaks around moderate positive momentum,
 * penalizes extreme overbought, gives mild bonus to oversold.
 */
function computeRsiSignal(change: number): number {
  if (change < -50) return 0.6  // oversold, mild bullish
  if (change < -20) return 0.5
  if (change < 0) return 0.4
  if (change < 30) return 0.7  // healthy uptrend
  if (change < 60) return 0.5  // getting overbought
  return 0.3                    // overbought
}

/**
 * Normalize a value to 0-1 range given min/max bounds.
 */
function normalizeScore(value: number | null, min: number, max: number): number {
  if (value == null) return 0.5 // neutral default
  const clamped = Math.max(min, Math.min(max, value))
  return (clamped - min) / (max - min)
}

/**
 * Assign quintile ranks (1-5, 1 = best) across a universe of protocols.
 * Takes an array of raw scores and returns ratings for each.
 */
export function assignQuintileRatings(
  rawScores: RatingRawScores[],
): Map<string, ProtocolRatings> {
  const n = rawScores.length
  if (n === 0) return new Map()

  const ratingsMap = new Map<string, ProtocolRatings>()

  // For each dimension, sort and assign quintiles
  const timelinessRanks = quintileRank(rawScores, 'timelinessScore')
  const safetyRanks = quintileRank(rawScores, 'safetyScore')
  const technicalRanks = quintileRank(rawScores, 'technicalScore')

  for (const score of rawScores) {
    ratingsMap.set(score.slug, {
      timeliness: timelinessRanks.get(score.slug) ?? 3,
      safety: safetyRanks.get(score.slug) ?? 3,
      technical: technicalRanks.get(score.slug) ?? 3,
    })
  }

  return ratingsMap
}

/**
 * Quintile rank a list of scores. Returns map of slug -> rank (1-5).
 * Higher raw score = better = rank 1.
 */
function quintileRank(
  scores: RatingRawScores[],
  field: keyof Omit<RatingRawScores, 'slug'>,
): Map<string, number> {
  const sorted = [...scores].sort((a, b) => b[field] - a[field]) // descending
  const n = sorted.length
  const ranks = new Map<string, number>()

  sorted.forEach((score, index) => {
    const percentile = index / n
    let rank: number
    if (percentile < 0.2) rank = 1
    else if (percentile < 0.4) rank = 2
    else if (percentile < 0.6) rank = 3
    else if (percentile < 0.8) rank = 4
    else rank = 5
    ranks.set(score.slug, rank)
  })

  return ranks
}
