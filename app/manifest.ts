import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const festName = process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26";
  return {
    name: `${festName} Live`,
    short_name: festName,
    description:
      "Live schedule, venues, audience voting and Stamp Hunt for Fiesta'26 at SDMCET Dharwad.",
    start_url: '/',
    display: 'standalone',
    background_color: '#12091E',
    theme_color: '#12091E',
    icons: [
      {
        src: '/brand/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/brand/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
