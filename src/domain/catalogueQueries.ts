import type { Bundle, Catalogue, CategoryId, Plan, Service } from './types';
import { annualEquivalent, cycleSuffix, monthlyEquivalent } from './billing';
import { inrPrice } from './money';
import type { CatalogueIndex } from './spending';

export function activePlans(idx: CatalogueIndex, serviceId: string): Plan[] {
  return (idx.plansByService.get(serviceId) ?? []).filter((p) => p.status === 'active');
}

/** True when every priced, active plan costs nothing (e.g. a free loyalty programme). */
export function isFreeOnly(idx: CatalogueIndex, serviceId: string): boolean {
  const priced = activePlans(idx, serviceId).filter((p) => p.price !== null);
  return priced.length > 0 && priced.every((p) => p.price === 0);
}

/**
 * The plan with the lowest monthly equivalent among priced, active plans.
 * Free tiers are skipped when the service also has paid plans, so "From ₹X"
 * describes what paying costs.
 */
export function startingPlan(idx: CatalogueIndex, serviceId: string): Plan | null {
  const hasPaid = activePlans(idx, serviceId).some((p) => p.price !== null && p.price > 0);
  let best: Plan | null = null;
  let bestMonthly = Infinity;
  for (const p of activePlans(idx, serviceId)) {
    if (p.price === null || (hasPaid && p.price === 0)) continue;
    const m = monthlyEquivalent(p.price, p.billing);
    if (m < bestMonthly) {
      best = p;
      bestMonthly = m;
    }
  }
  return best;
}

export function startingMonthly(idx: CatalogueIndex, serviceId: string): number | null {
  const p = startingPlan(idx, serviceId);
  return p && p.price !== null ? monthlyEquivalent(p.price, p.billing) : null;
}

export function priceLabel(price: number, cycle: Plan['billing']): string {
  if (price === 0) return 'Free';
  return `${inrPrice(price)}${cycleSuffix(cycle)}`;
}

/** Saving from paying for the same plan on a longer cycle, per plan group. */
export interface CycleSaving {
  service: Service;
  shortPlan: Plan;
  longPlan: Plan;
  shortAnnual: number;
  longAnnual: number;
  saving: number;
  verified: boolean;
}

export function cycleSavings(catalogue: Catalogue, idx: CatalogueIndex): CycleSaving[] {
  const groups = new Map<string, Plan[]>();
  for (const p of catalogue.plans) {
    if (p.status !== 'active' || p.price === null || !p.group) continue;
    const g = groups.get(p.group) ?? [];
    g.push(p);
    groups.set(p.group, g);
  }
  const out: CycleSaving[] = [];
  for (const plans of groups.values()) {
    if (plans.length < 2) continue;
    const byAnnual = plans.map((p) => ({ p, a: annualEquivalent(p.price!, p.billing) }));
    const dearest = byAnnual.reduce((x, y) => (y.a > x.a ? y : x));
    const cheapest = byAnnual.reduce((x, y) => (y.a < x.a ? y : x));
    if (cheapest.a >= dearest.a - 1) continue;
    const service = idx.services.get(cheapest.p.serviceId);
    if (!service) continue;
    out.push({
      service,
      shortPlan: dearest.p,
      longPlan: cheapest.p,
      shortAnnual: dearest.a,
      longAnnual: cheapest.a,
      saving: dearest.a - cheapest.a,
      verified: dearest.p.verification === 'verified' && cheapest.p.verification === 'verified',
    });
  }
  return out.sort((a, b) => b.saving - a.saving);
}

export interface BundleComparison {
  /** Monthly cost of the bundle itself. */
  bundleMonthly: number | null;
  /** Standalone monthly cost of the included plans we can price exactly. */
  pricedMonthly: number;
  pricedPlans: Plan[];
  /** Included services we cannot price like-for-like. */
  unpricedServiceIds: string[];
}

export function compareBundle(b: Bundle, idx: CatalogueIndex): BundleComparison {
  const pricedPlans = b.includedPlanIds
    .map((id) => idx.plans.get(id))
    .filter((p): p is Plan => !!p && p.price !== null);
  const pricedServices = new Set(pricedPlans.map((p) => p.serviceId));
  return {
    bundleMonthly: b.price !== null ? monthlyEquivalent(b.price, b.billing) : null,
    pricedMonthly: pricedPlans.reduce((t, p) => t + monthlyEquivalent(p.price!, p.billing), 0),
    pricedPlans,
    unpricedServiceIds: b.includedServiceIds.filter((id) => !pricedServices.has(id)),
  };
}

/** Most popular first: ranked services by rank, then the rest A–Z. */
export function byPopularity(a: Service, b: Service): number {
  const ra = a.rank ?? Infinity;
  const rb = b.rank ?? Infinity;
  if (ra !== rb) return ra - rb;
  return a.name.localeCompare(b.name);
}

/** The `n` most popular services in each category, in category order, skipping empty categories. */
export function popularByCategory(services: Service[], order: readonly CategoryId[], n: number) {
  return order
    .map((category) => {
      const all = services.filter((s) => s.category === category).sort(byPopularity);
      return { category, total: all.length, top: all.slice(0, n) };
    })
    .filter((g) => g.total > 0);
}
