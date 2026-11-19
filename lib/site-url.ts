/**
 * Helper to get the canonical site origin.
 * Prevents QR codes, share links, and redirects from ever pointing to localhost.
 */
export function getSiteOrigin(): string {
  // 1. If running in browser and NOT localhost, use the actual domain the user is visiting
  if (
    typeof window !== 'undefined' &&
    window.location.origin &&
    !window.location.origin.includes('localhost')
  ) {
    return window.location.origin.replace(/\/$/, '');
  }

  // 2. Next, check NEXT_PUBLIC_SITE_URL if defined and NOT localhost
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }

  // 3. If in browser (even localhost), fall back to window.location.origin
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  // 4. Default production fallback
  return 'https://fiesta26.pages.dev';
}
