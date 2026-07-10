/** Strip any non-numeric (and non-dot) characters so only valid numbers are accepted. */
export function toNumericString(val: string): string {
  return val.replace(/[^0-9.]/g, '');
}

/** Parse a numeric input string to number or undefined (handles empty / zero correctly). */
export function parseFilterNumber(val: string): number | undefined {
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}
