import { ProtocolRatings } from '@/lib/types'

interface RatingsBoxProps {
  ratings: ProtocolRatings | null
}

function RatingCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between items-center border-b border-black last:border-b-0 px-2 py-0.5">
      <span className="stat-label">{label}</span>
      <span className="text-lg font-bold tabular-nums">
        {value != null ? value : '—'}
      </span>
    </div>
  )
}

export default function RatingsBox({ ratings }: RatingsBoxProps) {
  return (
    <div className="tearsheet-section">
      <div className="tearsheet-section-title">Ratings (1=Best, 5=Worst)</div>
      <RatingCell label="Timeliness" value={ratings?.timeliness ?? null} />
      <RatingCell label="Safety" value={ratings?.safety ?? null} />
      <RatingCell label="Technical" value={ratings?.technical ?? null} />
    </div>
  )
}
