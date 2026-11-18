/**
 * Escapes a CSV cell value and neutralises Excel/Sheets formula injection
 * by prefixing cells that start with =, +, -, or @ with a single quote.
 */
export function csvSafeCell(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\r\n]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

export function buildSafeCsv(
  headers: string[],
  rows: Array<Array<unknown>>
): string {
  const lines = [
    headers.map(csvSafeCell).join(','),
    ...rows.map((row) => row.map(csvSafeCell).join(',')),
  ];
  return lines.join('\r\n');
}
