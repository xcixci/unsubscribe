import type { Bundle, Offer, Plan, UserSubscription } from './types';
import { annualEquivalent, cycleMonths, cycleDays } from './billing';
import { effectiveOfferStatus } from './offers';
import type { CatalogueIndex } from './spending';
import { todayIso } from './dates';

/**
 * Alternatives for one of the user's subscriptions, ranked by genuine value
 * to the user — never by commission. Rules:
 *  - A "saving" is only claimed when the alternative's annual cost is lower
 *    than what the user actually pays.
 *  - Same product on a longer billing cycle ranks first: no loss of features.
 *  - Cheaper tiers are flagged as reducing functionality.
 *  - Eligibility-limited options (student, offers) say so.
 *  - Bundles are never presented as savings: they also pay for connectivity.
 */

export type RecommendationKind =
  | 'longer_cycle'
  | 'offer'
  | 'student_plan'
  | 'cheaper_tier'
  | 'shared_plan'
  | 'bundle'
  | 'price_check';

export type Tradeoff = 'none' | 'upfront' | 'fewer_features' | 'eligibility' | 'sharing' | 'bundle' | 'info';

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  title: string;
  detail: string;
  /** Annual cost of the alternative, if known. */
  annualCost: number | null;
  /** Positive = cheaper than what the user pays today (per year). */
  annualDifference: number | null;
  tradeoff: Tradeoff;
  verified: boolean;
  plan?: Plan;
  offer?: Offer;
  bundle?: Bundle;
  score: number;
}

function cycleLength(p: Plan): number {
  return cycleMonths(p.billing) ?? (cycleDays(p.billing) ?? 0) / 30.4;
}

export function recommendationsFor(
  sub: UserSubscription,
  idx: CatalogueIndex,
  offers: Offer[],
  bundles: Bundle[],
  today: string = todayIso(),
): Recommendation[] {
  if (!sub.serviceId || sub.status === 'cancelled') return [];
  const userAnnual = annualEquivalent(sub.amount, sub.billing);
  const current = sub.planId ? idx.plans.get(sub.planId) ?? null : null;
  const plans = (idx.plansByService.get(sub.serviceId) ?? []).filter(
    (p) => p.status === 'active' && p.price !== null && p.id !== sub.planId,
  );
  const recs: Recommendation[] = [];

  // 1. Price check against the listed price of the user's own plan.
  if (current && current.price !== null && current.status === 'active') {
    const listedAnnual = annualEquivalent(current.price, current.billing);
    const gap = userAnnual - listedAnnual;
    if (listedAnnual > 0 && Math.abs(gap) / listedAnnual > 0.05) {
      recs.push({
        id: `${sub.id}-price-check`,
        kind: 'price_check',
        title: gap > 0 ? 'You pay more than the listed price' : 'You pay less than today’s listed price',
        detail:
          gap > 0
            ? 'Your amount works out higher than the catalogue price for this plan. Your renewal price may have gone up, or your amount includes add-ons or taxes. Check your last bill.'
            : 'You may be on an older price or an offer. Changing or cancelling your plan could lose it — new subscribers pay the listed price.',
        annualCost: listedAnnual,
        annualDifference: gap,
        tradeoff: 'info',
        verified: current.verification === 'verified',
        plan: current,
        score: 30,
      });
    }
  }

  for (const p of plans) {
    const annual = annualEquivalent(p.price!, p.billing);
    const diff = userAnnual - annual;
    const verified = p.verification === 'verified';
    const sameGroup = !!current?.group && current.group === p.group;

    if (sameGroup) {
      if (diff <= 0) continue;
      const longer = cycleLength(p) > (current ? cycleLength(current) : 0);
      recs.push({
        id: `${sub.id}-${p.id}`,
        kind: 'longer_cycle',
        title: `Same plan, billed differently: ${p.name}`,
        detail: longer
          ? 'Same features, paid less often. You pay more upfront, and refunds are usually not available if you change your mind.'
          : 'Same features on a different billing cycle.',
        annualCost: annual,
        annualDifference: diff,
        tradeoff: longer ? 'upfront' : 'none',
        verified,
        plan: p,
        score: 100 + diff / 100,
      });
      continue;
    }

    if (p.planType === 'student') {
      if (diff <= 0) continue;
      recs.push({
        id: `${sub.id}-${p.id}`,
        kind: 'student_plan',
        title: `If you’re a student: ${p.name}`,
        detail: 'Needs proof of enrolment, usually re-checked every year.',
        annualCost: annual,
        annualDifference: diff,
        tradeoff: 'eligibility',
        verified,
        plan: p,
        score: 70 + diff / 100,
      });
      continue;
    }

    const isShared = p.planType === 'family' || p.planType === 'duo';
    const currentShared = current?.planType === 'family' || current?.planType === 'duo';
    if (isShared && !currentShared) {
      // Only useful if more than one person in the household pays separately.
      if (userAnnual <= 0 || annual >= userAnnual * 4) continue;
      const people = Math.max(2, Math.ceil(annual / userAnnual + 0.0001));
      recs.push({
        id: `${sub.id}-${p.id}`,
        kind: 'shared_plan',
        title: `Share it: ${p.name}`,
        detail: `Works out cheaper per person if ${people} or more people in your household would otherwise each pay what you pay. Members usually must live at the same address.`,
        annualCost: annual,
        annualDifference: null,
        tradeoff: 'sharing',
        verified,
        plan: p,
        score: 50,
      });
      continue;
    }

    if (diff > 0) {
      recs.push({
        id: `${sub.id}-${p.id}`,
        kind: 'cheaper_tier',
        title: `Cheaper plan: ${p.name}`,
        detail: 'Costs less, but check what you would lose — compare the features below before switching.',
        annualCost: annual,
        annualDifference: diff,
        tradeoff: 'fewer_features',
        verified,
        plan: p,
        score: 60 + diff / 1000,
      });
    }
  }

  for (const o of offers) {
    if (o.serviceId !== sub.serviceId) continue;
    const status = effectiveOfferStatus(o, today);
    if (status === 'expired') continue;
    const annual = o.offerPrice !== null && o.billing ? annualEquivalent(o.offerPrice, o.billing) : null;
    const diff = annual !== null ? userAnnual - annual : null;
    recs.push({
      id: `${sub.id}-${o.id}`,
      kind: 'offer',
      title: o.title,
      detail: o.eligibility ? `Eligibility: ${o.eligibility}` : 'Check eligibility on the official page.',
      annualCost: annual,
      annualDifference: diff,
      tradeoff: 'eligibility',
      verified: status === 'verified',
      offer: o,
      score: (status === 'verified' ? 90 : 55) + (diff && diff > 0 ? diff / 1000 : 0),
    });
  }

  for (const b of bundles) {
    if (b.status !== 'active' || !b.includedServiceIds.includes(sub.serviceId)) continue;
    recs.push({
      id: `${sub.id}-${b.id}`,
      kind: 'bundle',
      title: `Included in ${b.provider}: ${b.name}`,
      detail:
        'Bundles also pay for a mobile or broadband connection, so they are not a direct saving. They help only if you would pay for that connection anyway.',
      annualCost: b.price !== null ? annualEquivalent(b.price, b.billing) : null,
      annualDifference: null,
      tradeoff: 'bundle',
      verified: b.verification === 'verified',
      bundle: b,
      score: 40,
    });
  }

  return recs.sort((a, b) => b.score - a.score);
}

/** Best clear saving (no feature loss) across all subscriptions — for headline summaries. */
export function noLossSaving(recs: Recommendation[]): number {
  return recs
    .filter((r) => r.kind === 'longer_cycle' && (r.annualDifference ?? 0) > 0)
    .reduce((best, r) => Math.max(best, r.annualDifference ?? 0), 0);
}
