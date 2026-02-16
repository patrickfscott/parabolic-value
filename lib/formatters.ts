/**
 * Format a large number in compact notation ($1.2B, $340M, etc.)
 */
export function formatCompactCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'

  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`
  }
  return `${sign}$${abs.toFixed(2)}`
}

/**
 * Format a price with appropriate precision.
 * >$1: 2 decimals, <$1: 4 decimals
 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  if (Math.abs(value) >= 1) {
    return `$${value.toFixed(2)}`
  }
  return `$${value.toFixed(4)}`
}

/**
 * Format a ratio to 1-2 decimal places.
 */
export function formatRatio(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value) || !isFinite(value)) return 'N/A'
  return value.toFixed(decimals) + 'x'
}

/**
 * Format a percentage with 1 decimal.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

/**
 * Format a percentage (already in 0-100 form) with 1 decimal and % sign.
 */
export function formatPercentRaw(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return `${value.toFixed(1)}%`
}

/**
 * Format a large number with commas (no currency symbol).
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

/**
 * Format a compact number without currency symbol.
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'N/A'

  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K`
  }
  return `${sign}${abs.toFixed(0)}`
}

/**
 * Format a date from unix timestamp.
 */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get current date formatted for tearsheet header.
 */
export function formatTearsheetDate(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
