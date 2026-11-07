import type { BillingCycle, BillingFrequency } from './types';

/** Days in a year used to annualise day-based cycles (e.g. 28- or 84-day telecom packs). */
export const DAYS_PER_YEAR = 365;

export const FREQUENCIES: { id: BillingFrequency; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly (every 3 months)' },
  { id: 'half_yearly', label: 'Half-yearly (every 6 months)' },
  { id: 'annual', label: 'Annual (every 12 months)' },
  { id: 'custom', label: 'Custom (every N days or months)' },
];

const FIXED_MONTHS: Record<Exclude<BillingFrequency, 'custom'>, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  annual: 12,
};

export function isBillingFrequency(v: unknown): v is BillingFrequency {
  return v === 'monthly' || v === 'quarterly' || v === 'half_yearly' || v === 'annual' || v === 'custom';
}

/** Returns an error message if the cycle is unusable, otherwise null. */
export function validateCycle(cycle: BillingCycle): string | null {
  if (!isBillingFrequency(cycle.frequency)) return 'Choose how often you are billed.';
  if (cycle.frequency !== 'custom') return null;
  const i = cycle.interval;
  if (!i || (i.unit !== 'days' && i.unit !== 'months')) return 'Choose days or months for a custom cycle.';
  if (!Number.isFinite(i.count) || !Number.isInteger(i.count) || i.count < 1) {
    return 'A custom cycle needs a whole number of at least 1.';
  }
  if (i.unit === 'days' && i.count > 3660) return 'Custom cycles can be at most 3,660 days.';
  if (i.unit === 'months' && i.count > 120) return 'Custom cycles can be at most 120 months.';
  return null;
}

/** How many times this cycle bills in one year. 28-day packs bill ~13.04 times a year, not 12. */
export function cyclesPerYear(cycle: BillingCycle): number {
  if (cycle.frequency !== 'custom') return 12 / FIXED_MONTHS[cycle.frequency];
  const i = cycle.interval;
  if (!i || i.count <= 0) return 0;
  return i.unit === 'months' ? 12 / i.count : DAYS_PER_YEAR / i.count;
}

/** Annual equivalent of paying `amount` once per cycle. */
export function annualEquivalent(amount: number, cycle: BillingCycle): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount * cyclesPerYear(cycle);
}

/** Monthly equivalent of paying `amount` once per cycle. */
export function monthlyEquivalent(amount: number, cycle: BillingCycle): number {
  return annualEquivalent(amount, cycle) / 12;
}

/** Projection over `years`, assuming today's price and cycle stay the same. */
export function projectedCost(amount: number, cycle: BillingCycle, years: number): number {
  return annualEquivalent(amount, cycle) * years;
}

/** Whole months in a cycle, or null for day-based cycles. */
export function cycleMonths(cycle: BillingCycle): number | null {
  if (cycle.frequency !== 'custom') return FIXED_MONTHS[cycle.frequency];
  return cycle.interval?.unit === 'months' ? cycle.interval.count : null;
}

/** Days in a day-based custom cycle, otherwise null. */
export function cycleDays(cycle: BillingCycle): number | null {
  return cycle.frequency === 'custom' && cycle.interval?.unit === 'days' ? cycle.interval.count : null;
}

/** "per month", "every 3 months", "every 84 days" … */
export function cycleLabel(cycle: BillingCycle): string {
  switch (cycle.frequency) {
    case 'monthly':
      return 'per month';
    case 'quarterly':
      return 'every 3 months';
    case 'half_yearly':
      return 'every 6 months';
    case 'annual':
      return 'per year';
    case 'custom': {
      const i = cycle.interval;
      if (!i) return 'custom cycle';
      if (i.count === 1) return i.unit === 'days' ? 'every day' : 'per month';
      return `every ${i.count} ${i.unit}`;
    }
  }
}

/** Short suffix for prices: "/mo", "/yr", "/3 mo", "/84 days". */
export function cycleSuffix(cycle: BillingCycle): string {
  switch (cycle.frequency) {
    case 'monthly':
      return '/mo';
    case 'quarterly':
      return '/3 mo';
    case 'half_yearly':
      return '/6 mo';
    case 'annual':
      return '/yr';
    case 'custom': {
      const i = cycle.interval;
      if (!i) return '';
      if (i.unit === 'months') return i.count === 1 ? '/mo' : `/${i.count} mo`;
      return `/${i.count} days`;
    }
  }
}

/**
 * Build a cycle from catalogue columns. `billing_period_months` and
 * `billing_period_days` are only needed for custom cycles.
 */
export function cycleFromColumns(
  frequency: string,
  periodMonths?: number | null,
  periodDays?: number | null,
): BillingCycle | null {
  const f = frequency.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const normal: Record<string, BillingFrequency> = {
    monthly: 'monthly',
    month: 'monthly',
    quarterly: 'quarterly',
    half_yearly: 'half_yearly',
    halfyearly: 'half_yearly',
    semi_annual: 'half_yearly',
    annual: 'annual',
    yearly: 'annual',
    custom: 'custom',
  };
  const freq = normal[f];
  if (!freq) return null;
  if (freq !== 'custom') return { frequency: freq };
  if (periodDays && periodDays > 0) return { frequency: 'custom', interval: { unit: 'days', count: periodDays } };
  if (periodMonths && periodMonths > 0) return { frequency: 'custom', interval: { unit: 'months', count: periodMonths } };
  return null;
}
