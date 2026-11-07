import type { CategoryId, Catalogue, Plan, Service, UserSubscription } from './types';
import { annualEquivalent, monthlyEquivalent } from './billing';
import { isCategoryId } from './categories';

export interface SpendLine {
  sub: UserSubscription;
  name: string;
  category: CategoryId;
  service: Service | null;
  plan: Plan | null;
  monthly: number;
  annual: number;
}

export interface CategorySpend {
  category: CategoryId;
  monthly: number;
  annual: number;
  /** Share of total annual spend, 0–1. */
  share: number;
  count: number;
}

export interface SpendSummary {
  /** Everything still being paid for (active + considering cancellation). */
  lines: SpendLine[];
  monthly: number;
  annual: number;
  fiveYear: number;
  byCategory: CategorySpend[];
  /** Annual cost of subscriptions marked "considering cancellation". */
  consideringAnnual: number;
  consideringCount: number;
  /** Annual cost of subscriptions the user marked as cancelled (no longer counted). */
  cancelledAnnual: number;
  cancelledCount: number;
}

export interface CatalogueIndex {
  services: Map<string, Service>;
  plans: Map<string, Plan>;
  plansByService: Map<string, Plan[]>;
}

export function indexCatalogue(c: Pick<Catalogue, 'services' | 'plans'>): CatalogueIndex {
  const services = new Map(c.services.map((s) => [s.id, s]));
  const plans = new Map(c.plans.map((p) => [p.id, p]));
  const plansByService = new Map<string, Plan[]>();
  for (const p of c.plans) {
    const list = plansByService.get(p.serviceId) ?? [];
    list.push(p);
    plansByService.set(p.serviceId, list);
  }
  return { services, plans, plansByService };
}

export function describeSubscription(sub: UserSubscription, idx: CatalogueIndex) {
  const service = sub.serviceId ? idx.services.get(sub.serviceId) ?? null : null;
  const plan = sub.planId ? idx.plans.get(sub.planId) ?? null : null;
  const name = service?.name ?? sub.custom?.name ?? 'Unnamed subscription';
  const rawCategory = service?.category ?? sub.custom?.category ?? 'other';
  const category: CategoryId = isCategoryId(rawCategory) ? rawCategory : 'other';
  return { service, plan, name, category };
}

/** The user's own amount always wins over the catalogue's listed price. */
export function toLine(sub: UserSubscription, idx: CatalogueIndex): SpendLine {
  const d = describeSubscription(sub, idx);
  return {
    sub,
    ...d,
    monthly: monthlyEquivalent(sub.amount, sub.billing),
    annual: annualEquivalent(sub.amount, sub.billing),
  };
}

export function summarise(subs: UserSubscription[], idx: CatalogueIndex): SpendSummary {
  const all = subs.map((s) => toLine(s, idx));
  const lines = all.filter((l) => l.sub.status !== 'cancelled').sort((a, b) => b.annual - a.annual);
  const cancelled = all.filter((l) => l.sub.status === 'cancelled');
  const considering = lines.filter((l) => l.sub.status === 'considering');

  const annual = lines.reduce((t, l) => t + l.annual, 0);
  const monthly = lines.reduce((t, l) => t + l.monthly, 0);

  const cat = new Map<CategoryId, CategorySpend>();
  for (const l of lines) {
    const c = cat.get(l.category) ?? { category: l.category, monthly: 0, annual: 0, share: 0, count: 0 };
    c.monthly += l.monthly;
    c.annual += l.annual;
    c.count += 1;
    cat.set(l.category, c);
  }
  const byCategory = [...cat.values()]
    .map((c) => ({ ...c, share: annual > 0 ? c.annual / annual : 0 }))
    .sort((a, b) => b.annual - a.annual);

  return {
    lines,
    monthly,
    annual,
    fiveYear: annual * 5,
    byCategory,
    consideringAnnual: considering.reduce((t, l) => t + l.annual, 0),
    consideringCount: considering.length,
    cancelledAnnual: cancelled.reduce((t, l) => t + l.annual, 0),
    cancelledCount: cancelled.length,
  };
}
