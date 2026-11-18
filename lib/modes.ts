export type AppMode = 'fest' | 'campus';

export interface AppStatus {
  mode: AppMode;
  fest_name: string;
  fest_starts_at: string;
  fest_ends_at: string;
  campus_from: string;
  writes_paused: boolean;
  banner: string | null;
  banner_level: 'info' | 'warning' | 'critical';
  server_time: string;
  is_preview?: boolean;
}

export const DEFAULT_APP_STATUS: AppStatus = {
  mode: 'fest',
  fest_name: process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26",
  fest_starts_at: '2026-11-25T00:00:00+05:30',
  fest_ends_at: '2026-11-27T23:59:59+05:30',
  campus_from: '2026-11-28T00:00:00+05:30',
  writes_paused: false,
  banner: null,
  banner_level: 'info',
  server_time: new Date().toISOString(),
  is_preview: false,
};

export const CAMPUS_BRAND = {
  name: 'Signals',
  tagline: 'SDMCET Campus Board',
  college:
    process.env.NEXT_PUBLIC_COLLEGE_NAME ||
    'SDM College of Engineering & Technology, Dharwad',
};

/**
 * Maps Postgres P0001 user-defined exceptions cleanly to friendly text.
 */
export function mapDbError(
  error: { code?: string; message?: string } | null | undefined,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;
  if (error.code === 'P0001' && error.message) {
    return error.message;
  }
  if (
    error.message?.includes('The fest is over') ||
    error.message?.includes('Writes are paused')
  ) {
    return error.message;
  }
  return fallback;
}
