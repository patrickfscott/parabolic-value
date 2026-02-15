import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getProtocolBySlug, PROTOCOLS } from '@/lib/protocols'
import { getProtocolData } from '@/lib/data'
import { computeRawScores, assignQuintileRatings } from '@/lib/ratings'
import { computeProjections } from '@/lib/projections'
import { ProtocolData } from '@/lib/types'
import Tearsheet from '@/components/Tearsheet'

interface PageProps {
  params: { slug: string }
}

export async function generateStaticParams() {
  return PROTOCOLS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const config = getProtocolBySlug(params.slug)
  if (!config) return { title: 'Protocol Not Found' }

  return {
    title: `${config.name} (${config.ticker}) — PARABOLIC VALUE`,
    description: `${config.name} DeFi protocol analysis tearsheet. ${config.description}`,
  }
}

export const revalidate = 86400 // 24 hours

export default async function ProtocolPage({ params }: PageProps) {
  const config = getProtocolBySlug(params.slug)
  if (!config) notFound()

  // Fetch data for the current protocol
  const { metrics, historicalPrices, annualSnapshots } = await getProtocolData(config)

  // Compute ratings across all protocols for quintile ranking
  // We need all protocols' raw scores to assign quintile ranks
  const allRawScores = (await Promise.allSettled(
    PROTOCOLS.map(async (p) => {
      const data = await getProtocolData(p)
      return computeRawScores(p.slug, data.metrics)
    })
  ))
    .filter((r): r is PromiseFulfilledResult<ReturnType<typeof computeRawScores>> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value)

  const ratingsMap = assignQuintileRatings(allRawScores)
  const ratings = ratingsMap.get(config.slug) ?? null

  // Compute projections
  const projections = computeProjections(metrics, annualSnapshots)

  const protocolData: ProtocolData = {
    config,
    metrics,
    historicalPrices,
    annualSnapshots,
    ratings,
    projections,
  }

  return (
    <main className="p-4 bg-gray-50 min-h-screen print:p-0 print:bg-white">
      <div className="no-print text-center mb-4">
        <a href="/" className="text-xs underline font-mono">
          &larr; Back to All Protocols
        </a>
      </div>
      <Tearsheet data={protocolData} />
    </main>
  )
}
