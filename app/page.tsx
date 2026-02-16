import { PROTOCOLS } from '@/lib/protocols'
import { getAllProtocolsData } from '@/lib/data'
import { computeRawScores, assignQuintileRatings } from '@/lib/ratings'
import { ProtocolRatings } from '@/lib/types'
import ProtocolList from '@/components/ProtocolList'

export const revalidate = 86400 // 24 hours

export default async function HomePage() {
  const allData = await getAllProtocolsData(PROTOCOLS)

  // Compute ratings across universe
  const rawScores = allData.map((d) => computeRawScores(d.config.slug, d.metrics))
  const ratingsMap = assignQuintileRatings(rawScores)

  const protocols = allData.map((d) => ({
    config: d.config,
    metrics: d.metrics,
    ratings: ratingsMap.get(d.config.slug) as ProtocolRatings | null ?? null,
  }))

  return (
    <main className="max-w-[8.5in] mx-auto p-4 bg-white min-h-screen">
      {/* Brand Header */}
      <div className="border-2 border-black mb-4">
        <div className="brand-header text-center py-3">
          <h1 className="text-2xl font-bold tracking-[0.3em] uppercase">
            Parabolic Value
          </h1>
          <p className="text-xxs tracking-[0.15em] uppercase mt-0.5 opacity-80">
            DeFi Protocol Analysis in the Value Line Tradition
          </p>
        </div>

        <div className="border-t border-black px-3 py-2">
          <p className="text-xs leading-relaxed">
            Fundamental analysis of the top DeFi protocols, presented in the style of the
            classic Value Line Investment Survey tearsheet. All data sourced from DefiLlama
            and CoinGecko. Updated daily.
          </p>
        </div>
      </div>

      {/* Protocol Table */}
      <div className="border-2 border-black">
        <div className="bg-black text-white px-3 py-1">
          <span className="text-xs font-bold uppercase tracking-wider font-sans">
            Protocol Universe — Ranked by Annualized Revenue
          </span>
        </div>
        <div className="p-2">
          <ProtocolList protocols={protocols} />
        </div>
      </div>

      {/* Legend */}
      <div className="border-2 border-black border-t-0 px-3 py-1">
        <p className="text-xxs">
          <span className="font-bold">T</span> = Timeliness Rating (1-5, 1=Best) &middot;{' '}
          <span className="font-bold">S</span> = Safety Rating (1-5, 1=Best) &middot;{' '}
          <span className="font-bold">P/S</span> = Price-to-Sales Ratio &middot;{' '}
          Click any protocol name for full tearsheet.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-xxs text-gray-600">
        <p>
          Data: DefiLlama &middot; CoinGecko &middot; Updated daily &middot;
          Not financial advice
        </p>
        <p className="mt-1 font-bold text-black uppercase tracking-wider font-sans">
          parabolicvalue.com
        </p>
      </div>
    </main>
  )
}
