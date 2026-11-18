import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AppShell } from '@/components/app-shell';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || 'Fiest 2026';
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6D28D9' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1B2E' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: festName,
    template: `%s · ${festName}`,
  },
  description: `Live schedule, venues, announcements, results and campus Signals for ${festName} at ${collegeName}.`,
  openGraph: {
    type: 'website',
    siteName: festName,
    title: festName,
    description: `See what's happening now, up next, venues, results and Signals at ${festName} (${collegeName}).`,
  },
  twitter: {
    card: 'summary_large_image',
    title: festName,
    description: `Live campus guide for ${festName} at ${collegeName}.`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppShell festName={festName} collegeName={collegeName}>
          {children}
        </AppShell>
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  );
}
