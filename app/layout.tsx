import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Same Day Car Repair',
  description: 'Job management for mobile mechanics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}