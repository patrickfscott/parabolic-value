export default function Footer() {
  return (
    <div className="border-t-2 border-black mt-1 pt-1 px-3">
      <div className="flex justify-between text-xxs">
        <div>
          <span className="font-bold uppercase tracking-wider font-sans">
            Data Sources:
          </span>{' '}
          DefiLlama &middot; CoinGecko
        </div>
        <div className="font-bold uppercase tracking-wider font-sans">
          parabolicvalue.com
        </div>
      </div>
      <p className="text-xxs mt-0.5 leading-tight">
        This report is generated from publicly available on-chain and market data.
        All metrics are computed algorithmically and may contain errors or omissions.
        Ratings are relative rankings within the covered protocol universe and do not
        constitute investment advice. Past performance is not indicative of future results.
        Not financial advice. DYOR.
      </p>
    </div>
  )
}
