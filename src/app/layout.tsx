import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FinançasPro — Controle Total das suas Finanças',
  description: 'App financeiro com dashboard inteligente, controle de gastos, carteira de investimentos e IA financeira 24h. Pague via PIX e comece hoje.',
  manifest: '/manifest.json',
  keywords: ['finanças pessoais', 'controle financeiro', 'app financeiro', 'investimentos', 'orçamento pessoal', 'IA financeira'],
  authors: [{ name: 'FinançasPro' }],
  openGraph: {
    title: 'FinançasPro — Controle Total das suas Finanças',
    description: 'Dashboard inteligente, controle de gastos, carteira de investimentos e IA financeira 24h.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'FinançasPro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinançasPro — Controle Total das suas Finanças',
    description: 'Dashboard inteligente, controle de gastos e IA financeira.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinançasPro',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}

