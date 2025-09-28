import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import BackToTop from './components/ui/BackToTop'
import ErrorBoundary from './components/ErrorBoundary'
import { ClientAuthProvider } from './components/auth/ClientAuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taproot (atproto.at://) - AT Protocol Explorer',
  description: 'Preview AT Protocol links by prefixing atproto. to any AT Protocol URI',
  openGraph: {
    title: 'Taproot (atproto.at://) - AT Protocol Explorer',
    description: 'Preview AT Protocol links by prefixing atproto. to any AT Protocol URI',
    url: 'https://atproto.at',
    siteName: 'Taproot (atproto.at://)',
    images: [
      {
        url: 'https://atproto.at/atprotoat_ogimage.png',
        width: 1200,
        height: 630,
        alt: 'Taproot (atproto.at://) - AT Protocol Explorer',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taproot (atproto.at://) - AT Protocol Explorer',
    description: 'Preview AT Protocol links by prefixing atproto. to any AT Protocol URI',
    images: ['https://atproto.at/atprotoat_ogimage.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ]
  },
  manifest: '/site.webmanifest'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-white dark:bg-gray-900">
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <ErrorBoundary>
          <ClientAuthProvider>
            {children}
          </ClientAuthProvider>
        </ErrorBoundary>
        <BackToTop />
      </body>
    </html>
  )
}
