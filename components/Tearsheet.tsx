import { ProtocolData } from '@/lib/types'
import Header from './Header'
import PriceChart from './PriceChart'
import RatingsBox from './RatingsBox'
import KeyStats from './KeyStats'
import HistoricalTable from './HistoricalTable'
import ProjectionsTable from './ProjectionsTable'
import Footer from './Footer'

interface TearsheetProps {
  data: ProtocolData
}

export default function Tearsheet({ data }: TearsheetProps) {
  return (
    <div className="max-w-[8.5in] mx-auto bg-white border-2 border-black">
      {/* Header */}
      <Header protocol={data.config} />

      {/* Top section: Chart + Ratings side by side */}
      <div className="grid grid-cols-[1fr_180px] items-start">
        <PriceChart data={data.historicalPrices} ticker={data.config.ticker} />
        <RatingsBox ratings={data.ratings} />
      </div>

      {/* Key Statistics */}
      <KeyStats metrics={data.metrics} />

      {/* Historical Data Table */}
      <HistoricalTable snapshots={data.annualSnapshots} />

      {/* Projections */}
      <ProjectionsTable projections={data.projections} />

      {/* Footer */}
      <Footer />
    </div>
  )
}
