import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import { SwRegister } from '@/components/sw-register';
import { Toaster } from '@/components/ui/sonner';
import './globals-compiled.css';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26";
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fiesta26.pages.dev';

export const viewport: Viewport = {
  themeColor: '#12091E',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: '/manifest.webmanifest',
  title: {
    default: `${festName} Live · SDMCET`,
    template: `%s · ${festName} Live`,
  },
  description: `Live schedule, venues, audience voting, Treasure Hunt and updates for ${festName} at ${collegeName}.`,
  icons: {
    icon: [
      { url: '/brand/signals/icons/favicon-32.png?v=6', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico?v=6', sizes: 'any' },
      { url: '/brand/signals/signals-app-icon.svg?v=6', type: 'image/svg+xml' },
      { url: '/brand/signals/icons/signals-icon-192.png?v=6', sizes: '192x192', type: 'image/png' },
      { url: '/brand/signals/icons/signals-icon-512.png?v=6', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/brand/signals/icons/apple-touch-icon.png?v=6',
  },
  appleWebApp: {
    capable: true,
    title: `${festName} Live`,
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    siteName: `${festName} Live`,
    title: `${festName} Live · SDMCET`,
    description: `See what's happening now, up next, registration links, audience voting and Treasure Hunt at ${festName} (${collegeName}).`,
    images: [
      {
        url: '/brand/fiesta26-banner.jpg',
        width: 1200,
        height: 630,
        alt: `${festName} — Intra College Cultural Fest, SDMCET Dharwad`,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/brand/signals/icons/favicon-32.png?v=6" />
        <link rel="icon" href="/favicon.ico?v=6" sizes="any" />
        <link rel="icon" type="image/png" sizes="192x192" href="/brand/signals/icons/signals-icon-192.png?v=6" />
        <link rel="icon" type="image/svg+xml" href="/brand/signals/signals-app-icon.svg?v=6" />
        <link rel="apple-touch-icon" href="/brand/signals/icons/apple-touch-icon.png?v=6" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Bungee&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#12091E] text-[#F4F2FA] font-sans">
        <AppShell festName={festName} collegeName={collegeName}>
          {children}
        </AppShell>
        <SwRegister />
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
