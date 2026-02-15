import { AnnualSnapshot } from '@/lib/types'
import {
  formatPrice,
  formatCompactCurrency,
  formatRatio,
  formatPercentRaw,
} from '@/lib/formatters'

interface HistoricalTableProps {
  snapshots: AnnualSnapshot[]
}

export default function HistoricalTable({ snapshots }: HistoricalTableProps) {
  if (snapshots.length === 0) {
    return (
      <div className="tearsheet-section">
        <div className="tearsheet-section-title">Annual Financial History</div>
        <div className="text-xs text-center py-4">
          Insufficient historical data available.
        </div>
      </div>
    )
  }

  return (
    <div className="tearsheet-section">
      <div className="tearsheet-section-title">Annual Financial History</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xxs">
          <thead>
            <tr>
              <th className="text-left">Year</th>
              <th className="text-right">Avg Price</th>
              <th className="text-right">Avg MCap</th>
              <th className="text-right">Avg TVL</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Fees</th>
              <th className="text-right">P/S</th>
              <th className="text-right">TVL/MCap</th>
              <th className="text-right">Rev/TVL</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => (
              <tr key={s.year}>
                <td className="font-bold">{s.year}</td>
                <td className="text-right">{formatPrice(s.avgPrice)}</td>
                <td className="text-right">{formatCompactCurrency(s.avgMarketCap)}</td>
                <td className="text-right">{formatCompactCurrency(s.avgTvl)}</td>
                <td className="text-right">{formatCompactCurrency(s.totalRevenue)}</td>
                <td className="text-right">{formatCompactCurrency(s.totalFees)}</td>
                <td className="text-right">{formatRatio(s.psRatio)}</td>
                <td className="text-right">{formatRatio(s.tvlMcapRatio)}</td>
                <td className="text-right">
                  {s.revenueYield != null ? formatPercentRaw(s.revenueYield) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
