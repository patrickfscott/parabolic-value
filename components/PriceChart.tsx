'use client'

import { HistoricalDataPoint } from '@/lib/types'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface PriceChartProps {
  data: HistoricalDataPoint[]
  ticker: string
}

interface ChartDataPoint {
  date: string
  price: number | null
  tvl: number | null
}

function formatChartDate(timestamp: number): string {
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function formatAxisPrice(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  if (value >= 1) return `$${value.toFixed(0)}`
  return `$${value.toFixed(2)}`
}

function formatAxisTvl(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(0)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  return `$${(value / 1_000).toFixed(0)}K`
}

export default function PriceChart({ data, ticker }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="tearsheet-section">
        <div className="tearsheet-section-title">Price & TVL History</div>
        <div className="text-xs text-center py-8">Data unavailable</div>
      </div>
    )
  }

  // Sample data to ~365 points max for performance
  const step = Math.max(1, Math.floor(data.length / 365))
  const sampled: ChartDataPoint[] = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((d) => ({
      date: formatChartDate(d.date),
      price: d.price,
      tvl: d.tvl,
    }))

  const hasTvl = sampled.some((d) => d.tvl != null)

  return (
    <div className="tearsheet-section">
      <div className="tearsheet-section-title">
        {ticker} Price & TVL History
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampled} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="#ccc"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 8, fontFamily: 'IBM Plex Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#000', strokeWidth: 1 }}
              interval={Math.floor(sampled.length / 6)}
            />
            <YAxis
              yAxisId="price"
              orientation="left"
              tick={{ fontSize: 8, fontFamily: 'IBM Plex Mono' }}
              tickFormatter={formatAxisPrice}
              tickLine={false}
              axisLine={{ stroke: '#000', strokeWidth: 1 }}
              width={50}
            />
            {hasTvl && (
              <YAxis
                yAxisId="tvl"
                orientation="right"
                tick={{ fontSize: 8, fontFamily: 'IBM Plex Mono' }}
                tickFormatter={formatAxisTvl}
                tickLine={false}
                axisLine={{ stroke: '#000', strokeWidth: 1 }}
                width={50}
              />
            )}
            <Tooltip
              contentStyle={{
                fontFamily: 'IBM Plex Mono',
                fontSize: '10px',
                border: '1px solid #000',
                borderRadius: 0,
                background: '#fff',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'price') return [`$${value.toFixed(2)}`, 'Price']
                if (name === 'tvl') return [formatAxisTvl(value), 'TVL']
                return [value, name]
              }}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#000"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              name="price"
            />
            {hasTvl && (
              <Line
                yAxisId="tvl"
                type="monotone"
                dataKey="tvl"
                stroke="#000"
                strokeWidth={1}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
                name="tvl"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-1 text-xxs">
        <span>&#9473; Price (left axis)</span>
        {hasTvl && <span>- - - TVL (right axis)</span>}
      </div>
    </div>
  )
}
