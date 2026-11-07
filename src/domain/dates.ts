import type { BillingCycle } from './types';
import { cycleDays, cycleMonths } from './billing';

/** Plain calendar dates as YYYY-MM-DD strings, computed in UTC to avoid time-zone drift. */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = ISO.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function parse(iso: string): Date {
  const m = ISO.exec(iso)!;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

function fmt(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** Today's date in the visitor's own time zone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const da = String(now.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fmt(d);
}

/** Adds months, clamping to the last day of the month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const d = parse(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fmt(target);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parse(toIso).getTime() - parse(fromIso).getTime()) / 86_400_000);
}

/** The k-th renewal after an anchor date (k = 0 is the anchor itself). */
export function nthRenewal(anchor: string, cycle: BillingCycle, k: number): string {
  const months = cycleMonths(cycle);
  if (months !== null) return addMonths(anchor, months * k);
  const days = cycleDays(cycle);
  if (days !== null) return addDays(anchor, days * k);
  return anchor;
}

/**
 * The next renewal on or after `today`, rolling a past anchor date forward
 * by whole billing cycles. Computed from the anchor each step to avoid drift.
 */
export function nextRenewalOnOrAfter(anchor: string, cycle: BillingCycle, today: string): string {
  if (!isIsoDate(anchor)) return anchor;
  if (anchor >= today) return anchor;
  const months = cycleMonths(cycle);
  const days = cycleDays(cycle);
  let k = 0;
  if (days !== null) {
    k = Math.ceil(daysBetween(anchor, today) / days);
  } else if (months !== null) {
    const a = parse(anchor);
    const t = parse(today);
    const diffMonths = (t.getUTCFullYear() - a.getUTCFullYear()) * 12 + (t.getUTCMonth() - a.getUTCMonth());
    k = Math.max(0, Math.floor(diffMonths / months));
  } else {
    return anchor;
  }
  let next = nthRenewal(anchor, cycle, k);
  let guard = 0;
  while (next < today && guard < 1000) {
    k += 1;
    next = nthRenewal(anchor, cycle, k);
    guard += 1;
  }
  return next;
}

const longFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function formatDate(iso: string | null | undefined): string {
  if (!iso || !isIsoDate(iso)) return '';
  return longFmt.format(parse(iso));
}

export function formatShortDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  return shortFmt.format(parse(iso));
}

/** "today", "tomorrow", "in 5 days", "5 days ago". */
export function relativeDays(fromIso: string, toIso: string): string {
  const n = daysBetween(fromIso, toIso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
