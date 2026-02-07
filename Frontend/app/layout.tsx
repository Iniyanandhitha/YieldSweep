import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Yield-Sweep - Automated DeFi Liquidity Manager',
  description: 'Automated yield generation for your idle stablecoins. Keep your spending money liquid; invest the rest automatically.',
  generator: 'v0.app',
  keywords: ['DeFi', 'Yield', 'Cryptocurrency', 'Stablecoins', 'USDC'],
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
