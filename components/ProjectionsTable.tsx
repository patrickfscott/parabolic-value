import { ProtocolProjections } from '@/lib/types'
import { formatCompactCurrency, formatRatio, formatPrice } from '@/lib/formatters'

interface ProjectionsTableProps {
  projections: ProtocolProjections | null
}

export default function ProjectionsTable({ projections }: ProjectionsTableProps) {
  if (!projections) {
    return (
      <div className="tearsheet-section">
        <div className="tearsheet-section-title">Forward Estimates</div>
        <div className="text-xs text-center py-4">
          Insufficient data for projections.
        </div>
      </div>
    )
  }

  const scenarios = [projections.base, projections.bull, projections.bear]

  return (
    <div className="tearsheet-section">
      <div className="tearsheet-section-title">Forward Estimates (Mechanical Projections)</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xxs">
          <thead>
            <tr>
              <th className="text-left">Scenario</th>
              <th className="text-right">1Y Rev</th>
              <th className="text-right">1Y P/S</th>
              <th className="text-right">1Y Price</th>
              <th className="text-right">3Y Rev</th>
              <th className="text-right">3Y P/S</th>
              <th className="text-right">3Y Price</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.label}>
                <td className="font-bold">{s.label}</td>
                <td className="text-right">{formatCompactCurrency(s.revenue1y)}</td>
                <td className="text-right">{formatRatio(s.ps1y)}</td>
                <td className="text-right">{formatPrice(s.impliedPrice1y)}</td>
                <td className="text-right">{formatCompactCurrency(s.revenue3y)}</td>
                <td className="text-right">{formatRatio(s.ps3y)}</td>
                <td className="text-right">{formatPrice(s.impliedPrice3y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xxs mt-1 italic leading-tight">
        Projections are mechanical extrapolations, not forecasts. They assume constant
        market conditions and linear growth rates. Not financial advice.
      </p>
    </div>
  )
}
