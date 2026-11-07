import { describe, expect, it } from 'vitest';
import { recommendationsFor } from '../src/domain/recommendations';
import { bundle, idx, offer, sub } from './fixtures';

const TODAY = '2026-11-07';

describe('recommendations', () => {
  it('ranks the same plan on a longer cycle first, with an honest saving', () => {
    const s = sub('1', 'hotstar', 149, { frequency: 'monthly' }, { planId: 'hotstar-super-monthly' });
    const recs = recommendationsFor(s, idx, [], [], TODAY);
    expect(recs[0].kind).toBe('longer_cycle');
    expect(recs[0].plan?.id).toBe('hotstar-super-annual');
    expect(recs[0].annualDifference).toBeCloseTo(149 * 12 - 1099, 6);
    expect(recs[0].tradeoff).toBe('upfront');
  });

  it('flags cheaper tiers as reducing functionality, and never suggests a pricier tier as a saving', () => {
    const s = sub('1', 'hotstar', 149, { frequency: 'monthly' }, { planId: 'hotstar-super-monthly' });
    const recs = recommendationsFor(s, idx, [], [], TODAY);
    const cheaper = recs.filter((r) => r.kind === 'cheaper_tier');
    expect(cheaper.map((r) => r.plan?.id)).toEqual(['hotstar-mobile-annual']);
    expect(cheaper[0].tradeoff).toBe('fewer_features');
    expect(recs.some((r) => r.plan?.id === 'hotstar-premium-monthly')).toBe(false);
  });

  it('ranks a feature-preserving saving above a bigger saving that loses features', () => {
    const s = sub('1', 'hotstar', 149, { frequency: 'monthly' }, { planId: 'hotstar-super-monthly' });
    const recs = recommendationsFor(s, idx, [], [], TODAY);
    const iLonger = recs.findIndex((r) => r.kind === 'longer_cycle');
    const iCheaper = recs.findIndex((r) => r.kind === 'cheaper_tier');
    expect(recs[iCheaper].annualDifference!).toBeGreaterThan(recs[iLonger].annualDifference!);
    expect(iLonger).toBeLessThan(iCheaper);
  });

  it('shows student plans with an eligibility caveat', () => {
    const s = sub('1', 'spotify', 139, { frequency: 'monthly' }, { planId: 'spotify-standard' });
    const student = recommendationsFor(s, idx, [], [], TODAY).find((r) => r.kind === 'student_plan')!;
    expect(student.tradeoff).toBe('eligibility');
    expect(student.annualDifference).toBeCloseTo((139 - 69) * 12, 6);
  });

  it('suggests a shared plan without claiming a saving', () => {
    const s = sub('1', 'spotify', 139, { frequency: 'monthly' }, { planId: 'spotify-standard' });
    const shared = recommendationsFor(s, idx, [], [], TODAY).find((r) => r.kind === 'shared_plan')!;
    expect(shared.annualDifference).toBeNull();
    expect(shared.detail).toMatch(/3 or more people/);
  });

  it('warns when the user pays less than today’s price (legacy price)', () => {
    const s = sub('1', 'netflix', 499, { frequency: 'monthly' }, { planId: 'netflix-premium' });
    const check = recommendationsFor(s, idx, [], [], TODAY).find((r) => r.kind === 'price_check')!;
    expect(check.title).toMatch(/less/);
  });

  it('hides expired offers and labels unverified ones', () => {
    const offers = [
      offer('old', 'netflix', { validUntil: '2026-07-06', offerPrice: 100, billing: { frequency: 'monthly' } }),
      offer('new', 'netflix', { verification: 'awaiting_verification', offerPrice: 99, billing: { frequency: 'monthly' } }),
    ];
    const s = sub('1', 'netflix', 649, { frequency: 'monthly' }, { planId: 'netflix-premium' });
    const recs = recommendationsFor(s, idx, offers, [], TODAY).filter((r) => r.kind === 'offer');
    expect(recs.map((r) => r.offer?.id)).toEqual(['new']);
    expect(recs[0].verified).toBe(false);
  });

  it('never presents bundles as savings', () => {
    const s = sub('1', 'netflix', 649, { frequency: 'monthly' }, { planId: 'netflix-premium' });
    const b = recommendationsFor(s, idx, [], [bundle('jio', ['netflix'])], TODAY).find((r) => r.kind === 'bundle')!;
    expect(b.annualDifference).toBeNull();
    expect(b.tradeoff).toBe('bundle');
  });

  it('returns nothing for custom or cancelled subscriptions', () => {
    expect(recommendationsFor(sub('1', null, 100, { frequency: 'monthly' }), idx, [], [], TODAY)).toEqual([]);
    expect(recommendationsFor(sub('1', 'netflix', 649, { frequency: 'monthly' }, { status: 'cancelled' }), idx, [], [], TODAY)).toEqual([]);
  });
});
