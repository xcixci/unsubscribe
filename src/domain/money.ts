/** INR formatting with Indian digit grouping (₹1,23,456). */

const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 });
const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Rounded to the rupee — use for estimates and totals. */
export function inr(value: number): string {
  return whole.format(Math.round(value));
}

/** Listed prices: shows paise only when the price has them (₹638.38), otherwise ₹649. */
export function inrPrice(value: number): string {
  return Number.isInteger(Math.round(value * 100) / 100) ? whole.format(value) : exact.format(value);
}

export function number(value: number): string {
  return plain.format(value);
}

export function percent(part: number, total: number): string {
  if (total <= 0) return '0%';
  const p = (part / total) * 100;
  if (p > 0 && p < 1) return '<1%';
  return `${Math.round(p)}%`;
}

/** Parse a user-typed amount: accepts "1,499", "₹ 1499.50", "1499". Returns null if invalid. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '').replace(/^rs\.?/i, '');
  if (cleaned === '' || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
