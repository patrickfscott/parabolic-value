import { ProtocolConfig } from '@/lib/types'
import { formatTearsheetDate } from '@/lib/formatters'

interface HeaderProps {
  protocol: ProtocolConfig
}

export default function Header({ protocol }: HeaderProps) {
  return (
    <div className="border-b-2 border-black">
      {/* Brand bar */}
      <div className="brand-header flex justify-between items-center">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-bold tracking-widest uppercase">
            Parabolic Value
          </span>
          <span className="text-xxs tracking-wider opacity-80">
            DeFi Protocol Analysis
          </span>
        </div>
        <span className="text-xxs tracking-wider">
          {formatTearsheetDate()}
        </span>
      </div>

      {/* Protocol info bar */}
      <div className="flex justify-between items-baseline px-3 py-1 border-t border-black bg-white">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold uppercase tracking-wide font-sans">
            {protocol.name}
          </span>
          <span className="text-sm font-bold">
            ({protocol.ticker})
          </span>
        </div>
        <div className="flex items-baseline gap-4 text-xxs uppercase tracking-wider">
          <span>{protocol.category}</span>
          <span className="border-l border-black pl-4">{protocol.chain}</span>
        </div>
      </div>

      {/* Description */}
      <div className="px-3 py-0.5 border-t border-black text-xxs">
        {protocol.description}
      </div>
    </div>
  )
}
