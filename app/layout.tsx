import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import PWARegister from '@/components/PWARegister'
import OfflineStatus from '@/components/OfflineStatus'
import './globals.css'

export const metadata: Metadata = {
  title: 'Same Day Car Repair',
  description: 'Job management for mobile mechanics',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SDCR',
  },
  icons: {
    apple: '/icons/icon-180.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
        <OfflineStatus />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
