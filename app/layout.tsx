import './globals.css'
import { DefaultTheme } from '@/themes'
import { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { NostrContextProvider } from '@/contexts/NostrContext'

export const metadata: Metadata = {
  metadataBase: new URL('https://wherostr.social'),
  title: 'Wherostr',
  description: 'Where are Nostriches ?',
  appleWebApp: {
    capable: true,
    title: 'Wherostr',
    startupImage: {
      url: '/ios/512.png',
    },
    statusBarStyle: 'default',
  },
  applicationName: 'Wherostr',
  manifest: '/manifest.webmanifest',
  themeColor: '#121212',
  openGraph: {
    type: 'website',
    images: '/windows11/Wide310x150Logo.scale-400.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="lightning" content="lnurlp:nickydev@getalby.com" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="h-[100dvh] overflow-y-auto">
        <NostrContextProvider>
          <DefaultTheme>{children}</DefaultTheme>
        </NostrContextProvider>
        <Analytics />
      </body>
    </html>
  )
}
