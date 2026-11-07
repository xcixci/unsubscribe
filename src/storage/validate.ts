import type { BillingCycle, PaymentMethod, PersonalData, SubscriptionStatus, UserSubscription } from '../domain/types';
import { isBillingFrequency, validateCycle } from '../domain/billing';
import { isCategoryId } from '../domain/categories';
import { isIsoDate } from '../domain/dates';

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'upi_autopay', label: 'UPI AutoPay' },
  { id: 'credit_card', label: 'Credit card' },
  { id: 'debit_card', label: 'Debit card' },
  { id: 'net_banking', label: 'Net banking' },
  { id: 'app_store', label: 'Apple App Store' },
  { id: 'google_play', label: 'Google Play' },
  { id: 'telecom_bill', label: 'Mobile or broadband bill' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'other', label: 'Other' },
];

const PAYMENT_IDS = new Set(PAYMENT_METHODS.map((p) => p.id));
const STATUSES: SubscriptionStatus[] = ['active', 'considering', 'cancelled'];

export const MAX_SUBSCRIPTIONS = 500;
export const MAX_NOTE = 500;
export const MAX_LABEL = 40;
export const MAX_AMOUNT = 10_000_000;

/**
 * Flags text that looks like a card, account or Aadhaar number (10+ digits,
 * allowing spaces or dashes). UNSUBSCRIBE never needs these.
 */
export function looksSensitive(text: string): boolean {
  const digits = text.replace(/[\s-]/g, '');
  return /\d{10,}/.test(digits) || /\b(cvv|otp|upi pin|mpin)\b/i.test(text);
}

export type ValidationResult = { ok: true; data: PersonalData; warnings: string[] } | { ok: false; error: string };

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

function cycle(v: unknown): BillingCycle | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!isBillingFrequency(o.frequency)) return null;
  const c: BillingCycle = { frequency: o.frequency };
  if (o.frequency === 'custom') {
    const i = o.interval as Record<string, unknown> | undefined;
    if (!i) return null;
    c.interval = { unit: i.unit as 'days' | 'months', count: Number(i.count) };
  }
  return validateCycle(c) ? null : c;
}

function subscription(v: unknown, i: number, warnings: string[]): UserSubscription | string {
  if (!v || typeof v !== 'object') return `Item ${i + 1} is not a subscription.`;
  const o = v as Record<string, unknown>;
  const id = str(o.id, 80);
  if (!id) return `Item ${i + 1} has no id.`;
  const amount = Number(o.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) return `Item ${i + 1} has an invalid amount.`;
  const billing = cycle(o.billing);
  if (!billing) return `Item ${i + 1} has an invalid billing cycle.`;
  const status = STATUSES.includes(o.status as SubscriptionStatus) ? (o.status as SubscriptionStatus) : 'active';

  const serviceId = str(o.serviceId, 80) ?? null;
  let custom: UserSubscription['custom'];
  if (!serviceId) {
    const c = (o.custom ?? {}) as Record<string, unknown>;
    const name = str(c.name, 80);
    if (!name) return `Item ${i + 1} needs a service or a custom name.`;
    custom = {
      name,
      category: isCategoryId(c.category) ? c.category : 'other',
      websiteUrl: safeUrl(c.websiteUrl),
    };
  }

  let notes = str(o.notes, MAX_NOTE);
  let paymentLabel = str(o.paymentLabel, MAX_LABEL);
  if (notes && looksSensitive(notes)) {
    notes = undefined;
    warnings.push(`Removed a note on item ${i + 1} that looked like a card or account number.`);
  }
  if (paymentLabel && looksSensitive(paymentLabel)) {
    paymentLabel = undefined;
    warnings.push(`Removed a payment label on item ${i + 1} that looked like a card or account number.`);
  }

  const offsets = Array.isArray(o.reminderOffsets)
    ? [...new Set(o.reminderOffsets.map(Number).filter((n) => [0, 1, 3, 7].includes(n)))]
    : undefined;
  const now = new Date().toISOString();
  return {
    id,
    serviceId,
    custom,
    planId: str(o.planId, 80) ?? null,
    amount: Math.round(amount * 100) / 100,
    currency: 'INR',
    billing,
    nextRenewal: isIsoDate(o.nextRenewal) ? o.nextRenewal : undefined,
    paymentMethod: PAYMENT_IDS.has(o.paymentMethod as PaymentMethod) ? (o.paymentMethod as PaymentMethod) : undefined,
    paymentLabel,
    notes,
    status,
    reminderOffsets: offsets && offsets.length ? offsets : undefined,
    createdAt: str(o.createdAt, 40) ?? now,
    updatedAt: str(o.updatedAt, 40) ?? now,
  };
}

export function safeUrl(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Validates data from localStorage or an imported backup file. */
export function validatePersonalData(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'This file is not an UNSUBSCRIBE backup.' };
  const o = input as Record<string, unknown>;
  if (o.app !== 'unsubscribe') return { ok: false, error: 'This file is not an UNSUBSCRIBE backup.' };
  if (o.schemaVersion !== 1) {
    return { ok: false, error: `This backup uses version ${String(o.schemaVersion)}, which this version of UNSUBSCRIBE cannot read.` };
  }
  if (!Array.isArray(o.subscriptions)) return { ok: false, error: 'The backup has no subscription list.' };
  if (o.subscriptions.length > MAX_SUBSCRIPTIONS) {
    return { ok: false, error: `Backups can hold up to ${MAX_SUBSCRIPTIONS} subscriptions.` };
  }
  const warnings: string[] = [];
  const subs: UserSubscription[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < o.subscriptions.length; i++) {
    const r = subscription(o.subscriptions[i], i, warnings);
    if (typeof r === 'string') return { ok: false, error: r };
    if (seen.has(r.id)) return { ok: false, error: `Two items share the id "${r.id}".` };
    seen.add(r.id);
    subs.push(r);
  }
  return {
    ok: true,
    warnings,
    data: {
      app: 'unsubscribe',
      schemaVersion: 1,
      updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
      subscriptions: subs,
    },
  };
}

/** Merge an imported backup into existing data: imported items replace items with the same id. */
export function mergeData(current: PersonalData, incoming: PersonalData): PersonalData {
  const byId = new Map(current.subscriptions.map((s) => [s.id, s]));
  for (const s of incoming.subscriptions) byId.set(s.id, s);
  return { ...current, updatedAt: new Date().toISOString(), subscriptions: [...byId.values()] };
}
