import Link from 'next/link'
import { ProtocolConfig, ProtocolMetrics, ProtocolRatings } from '@/lib/types'
import { formatCompactCurrency, formatRatio } from '@/lib/formatters'

interface ProtocolRow {
  config: ProtocolConfig
  metrics: ProtocolMetrics
  ratings: ProtocolRatings | null
}

interface ProtocolListProps {
  protocols: ProtocolRow[]
}

export default function ProtocolList({ protocols }: ProtocolListProps) {
  // Sort by annualized revenue (descending), nulls last
  const sorted = [...protocols].sort((a, b) => {
    const aRev = a.metrics.annualizedRevenue ?? -Infinity
    const bRev = b.metrics.annualizedRevenue ?? -Infinity
    return bRev - aRev
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left w-8">#</th>
            <th className="text-left">Name</th>
            <th className="text-left">Ticker</th>
            <th className="text-left">Category</th>
            <th className="text-right">TVL</th>
            <th className="text-right">Market Cap</th>
            <th className="text-right">Ann. Revenue</th>
            <th className="text-right">P/S</th>
            <th className="text-center w-10">T</th>
            <th className="text-center w-10">S</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.config.slug} className="hover:bg-gray-100">
              <td className="font-bold">{i + 1}</td>
              <td>
                <Link
                  href={`/protocol/${row.config.slug}`}
                  className="underline font-bold"
                >
                  {row.config.name}
                </Link>
              </td>
              <td className="font-bold">{row.config.ticker}</td>
              <td>{row.config.category}</td>
              <td className="text-right tabular-nums">
                {formatCompactCurrency(row.metrics.tvl)}
              </td>
              <td className="text-right tabular-nums">
                {formatCompactCurrency(row.metrics.marketCap)}
              </td>
              <td className="text-right tabular-nums">
                {formatCompactCurrency(row.metrics.annualizedRevenue)}
              </td>
              <td className="text-right tabular-nums">
                {formatRatio(row.metrics.psRatio)}
              </td>
              <td className="text-center font-bold">
                {row.ratings?.timeliness ?? '—'}
              </td>
              <td className="text-center font-bold">
                {row.ratings?.safety ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
