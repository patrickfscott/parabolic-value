import { ProtocolMetrics } from '@/lib/types'
import {
  formatPrice,
  formatCompactCurrency,
  formatRatio,
  formatPercent,
  formatPercentRaw,
  formatCompactNumber,
} from '@/lib/formatters'

interface KeyStatsProps {
  metrics: ProtocolMetrics
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-black last:border-b-0 flex justify-between px-1 py-px">
      <span className="stat-label">{label}</span>
      <span className="text-xs font-bold tabular-nums">{value}</span>
    </div>
  )
}

export default function KeyStats({ metrics }: KeyStatsProps) {
  return (
    <div className="tearsheet-section">
      <div className="tearsheet-section-title">Key Statistics</div>
      <div className="grid grid-cols-2 gap-x-3">
        {/* Column 1: Market Data */}
        <div>
          <StatItem label="Price" value={formatPrice(metrics.price)} />
          <StatItem label="Market Cap" value={formatCompactCurrency(metrics.marketCap)} />
          <StatItem label="FDV" value={formatCompactCurrency(metrics.fdv)} />
          <StatItem label="24h Volume" value={formatCompactCurrency(metrics.volume24h)} />
          <StatItem label="Circ. Supply" value={formatCompactNumber(metrics.circulatingSupply)} />
          <StatItem label="Total Supply" value={formatCompactNumber(metrics.totalSupply)} />
          <StatItem label="% Circulating" value={formatPercentRaw(metrics.percentCirculating)} />
          <StatItem label="ATH" value={formatPrice(metrics.ath)} />
          <StatItem
            label="Dist. from ATH"
            value={formatPercent(metrics.distanceFromATH)}
          />
        </div>

        {/* Column 2: DeFi Metrics */}
        <div>
          <StatItem label="TVL" value={formatCompactCurrency(metrics.tvl)} />
          <StatItem label="Ann. Revenue" value={formatCompactCurrency(metrics.annualizedRevenue)} />
          <StatItem label="Ann. Fees" value={formatCompactCurrency(metrics.annualizedFees)} />
          <StatItem label="Treasury" value={formatCompactCurrency(metrics.treasury)} />
          <StatItem label="P/S Ratio" value={formatRatio(metrics.psRatio)} />
          <StatItem label="P/F Ratio" value={formatRatio(metrics.pfRatio)} />
          <StatItem label="TVL/MCap" value={formatRatio(metrics.tvlMcapRatio)} />
          <StatItem label="FDV/Rev" value={formatRatio(metrics.fdvRevenue)} />
          <StatItem
            label="Rev. Yield"
            value={metrics.revenueYield != null ? formatPercentRaw(metrics.revenueYield) : 'N/A'}
          />
        </div>
      </div>
    </div>
  )
}
