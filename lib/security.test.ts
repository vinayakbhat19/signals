import { describe, expect, it } from 'vitest';
import { buildSafeCsv, csvSafeCell } from './csv-safe';
import { validateImageSignature } from './upload-validate';

describe('csv-safe (CSV formula injection defense)', () => {
  it('prefixes cells starting with =, +, -, or @ with a single quote', () => {
    expect(csvSafeCell('=HYPERLINK("http://x","y")')).toBe(
      `"'=HYPERLINK(""http://x"",""y"")"`
    );
    expect(csvSafeCell('+1234567890')).toBe("'+1234567890");
    expect(csvSafeCell('-10')).toBe("'-10");
    expect(csvSafeCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(csvSafeCell('Asha Kulkarni')).toBe('Asha Kulkarni');
  });

  it('builds valid RFC-4180 CSV rows', () => {
    const csv = buildSafeCsv(
      ['name', 'team'],
      [
        ['=CMD()', 'Team A'],
        ['Ravi, Kumar', 'Team "B"'],
      ]
    );
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('name,team');
    expect(lines[1]).toBe("'=CMD(),Team A");
    expect(lines[2]).toBe('"Ravi, Kumar","Team ""B"""');
  });
});

describe('upload-validate (magic-byte image signature defense)', () => {
  it('accepts valid JPEG, PNG, and WebP signatures', () => {
    expect(validateImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).ok).toBe(true);
    expect(
      validateImageSignature(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      ).ok
    ).toBe(true);
    expect(
      validateImageSignature(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ])
      ).ok
    ).toBe(true);
  });

  it('rejects text/HTML renamed to .jpg and oversized images (> 5 MB)', () => {
    const fakeJpg = new TextEncoder().encode('<script>alert(1)</script>');
    expect(validateImageSignature(fakeJpg).ok).toBe(false);

    const oversized = new Uint8Array(6 * 1024 * 1024);
    oversized[0] = 0xff;
    oversized[1] = 0xd8;
    oversized[2] = 0xff;
    expect(validateImageSignature(oversized).ok).toBe(false);
  });
});
