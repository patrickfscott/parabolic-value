import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PARABOLIC VALUE — DeFi Protocol Analysis',
  description: 'DeFi protocol fundamentals in the Value Line Investment Survey tradition.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
