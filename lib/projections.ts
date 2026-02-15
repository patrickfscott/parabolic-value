import { ProtocolMetrics, AnnualSnapshot, ProtocolProjections, ProjectionScenario } from './types'

/**
 * Compute projection scenarios based on historical CAGR and current metrics.
 */
export function computeProjections(
  metrics: ProtocolMetrics,
  annualSnapshots: AnnualSnapshot[],
): ProtocolProjections | null {
  if (
    metrics.annualizedRevenue == null ||
    metrics.psRatio == null ||
    metrics.circulatingSupply == null ||
    metrics.circulatingSupply === 0
  ) {
    return null
  }

  const currentRevenue = metrics.annualizedRevenue
  const currentPS = metrics.psRatio
  const circulatingSupply = metrics.circulatingSupply

  // Compute historical revenue CAGR
  const cagr = computeRevenueCAGR(annualSnapshots)

  // If no CAGR available, use a default moderate growth rate
  const baseGrowthRate = cagr != null ? cagr : 0.15

  // Base case: CAGR capped at 50%
  const baseRate = Math.min(baseGrowthRate, 0.50)
  const base = buildScenario(
    'Base Case',
    currentRevenue,
    currentPS,
    circulatingSupply,
    baseRate,
    0, // no P/S change
  )

  // Bull case: 1.5x CAGR, capped at 75%, P/S +25%
  const bullRate = Math.min(baseGrowthRate * 1.5, 0.75)
  const bull = buildScenario(
    'Bull Case',
    currentRevenue,
    currentPS,
    circulatingSupply,
    bullRate,
    0.25,
  )

  // Bear case: 0.5x CAGR, floor of -20%, P/S -25%
  const bearRate = Math.max(baseGrowthRate * 0.5, -0.20)
  const bear = buildScenario(
    'Bear Case',
    currentRevenue,
    currentPS,
    circulatingSupply,
    bearRate,
    -0.25,
  )

  return { base, bull, bear }
}

function buildScenario(
  label: string,
  currentRevenue: number,
  currentPS: number,
  circulatingSupply: number,
  growthRate: number,
  psChange: number,
): ProjectionScenario {
  const revenue1y = currentRevenue * (1 + growthRate)
  const revenue3y = currentRevenue * Math.pow(1 + growthRate, 3)
  const ps1y = currentPS * (1 + psChange)
  const ps3y = currentPS * Math.pow(1 + psChange, 3)

  let impliedPrice1y: number | null = (revenue1y * ps1y) / circulatingSupply
  let impliedPrice3y: number | null = (revenue3y * ps3y) / circulatingSupply

  // Guard against non-finite results from extreme inputs
  if (!isFinite(impliedPrice1y)) impliedPrice1y = null
  if (!isFinite(impliedPrice3y)) impliedPrice3y = null

  return {
    label,
    revenue1y,
    ps1y,
    impliedPrice1y,
    revenue3y,
    ps3y,
    impliedPrice3y,
  }
}

/**
 * Compute CAGR of revenue from annual snapshots.
 * Uses the earliest and most recent years with revenue data.
 */
function computeRevenueCAGR(snapshots: AnnualSnapshot[]): number | null {
  const withRevenue = snapshots.filter(
    (s) => s.totalRevenue != null && s.totalRevenue > 0
  )

  if (withRevenue.length < 2) return null

  const earliest = withRevenue[0]
  const latest = withRevenue[withRevenue.length - 1]
  const years = latest.year - earliest.year

  if (years <= 0 || earliest.totalRevenue == null || latest.totalRevenue == null) {
    return null
  }

  if (earliest.totalRevenue <= 0) return null

  const cagr = Math.pow(latest.totalRevenue / earliest.totalRevenue, 1 / years) - 1
  return cagr
}
