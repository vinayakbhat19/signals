import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26";
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const viewport: Viewport = {
  themeColor: '#12091E',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${festName} Live · SDMCET`,
    template: `%s · ${festName} Live`,
  },
  description: `Live schedule, venues, audience voting, Stamp Hunt and updates for ${festName} at ${collegeName}.`,
  icons: {
    icon: '/brand/icon-192.png',
    apple: '/brand/icon-192.png',
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
    description: `See what's happening now, up next, registration links, audience voting and Stamp Hunt at ${festName} (${collegeName}).`,
    images: [
      {
        url: '/brand/fiesta26-banner.jpg',
        width: 1200,
        height: 630,
        alt: `${festName} — Intra College Cultural Fest, SDMCET Dharwad`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${festName} Live · SDMCET`,
    description: `Live campus guide for ${festName} at ${collegeName}.`,
    images: ['/brand/fiesta26-banner.jpg'],
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
        <Toaster theme="dark" position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  );
}
