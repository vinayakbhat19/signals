export type AllowedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ImageValidationResult {
  ok: boolean;
  mime?: AllowedImageMime;
  ext?: 'jpg' | 'png' | 'webp';
  error?: string;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Checks real magic bytes (file signature) rather than trusting Content-Type
 * or filename extension. Rejects disguised text/HTML/SVG files and files > 5 MB.
 */
export function validateImageSignature(
  bytes: Uint8Array,
  maxBytes = MAX_BYTES
): ImageValidationResult {
  if (bytes.byteLength === 0) {
    return { ok: false, error: 'File is empty.' };
  }
  if (bytes.byteLength > maxBytes) {
    const mb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    return { ok: false, error: `Image must be under ${mb} MB.` };
  }

  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { ok: true, mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ok: true, mime: 'image/png', ext: 'png' };
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ok: true, mime: 'image/webp', ext: 'webp' };
  }

  return {
    ok: false,
    error: 'Only valid JPEG, PNG, or WebP images are allowed.',
  };
}
