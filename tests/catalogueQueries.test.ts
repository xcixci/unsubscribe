import { describe, expect, it } from 'vitest';
import { isFreeOnly, priceLabel, startingMonthly, startingPlan } from '../src/domain/catalogueQueries';
import { CATEGORIES, categoryLabel } from '../src/domain/categories';
import { indexCatalogue } from '../src/domain/spending';
import { plan, service } from './fixtures';

const services = [service('club', 'shopping'), service('hotel', 'travel'), service('paid', 'ott')];
const plans = [
  plan('club-free', 'club', 0, { frequency: 'annual' }),
  plan('club-plus', 'club', 999, { frequency: 'annual' }),
  plan('hotel-member', 'hotel', 0, { frequency: 'annual' }),
  plan('paid-basic', 'paid', 199, { frequency: 'monthly' }),
];
const idx = indexCatalogue({ services, plans });

describe('free plans', () => {
  it('labels a ₹0 plan as Free', () => {
    expect(priceLabel(0, { frequency: 'annual' })).toBe('Free');
    expect(priceLabel(199, { frequency: 'monthly' })).toBe('₹199/mo');
  });

  it('starts "from" the cheapest paid plan when a service also has a free tier', () => {
    expect(startingPlan(idx, 'club')?.id).toBe('club-plus');
    expect(isFreeOnly(idx, 'club')).toBe(false);
  });

  it('recognises services that are free to join', () => {
    expect(isFreeOnly(idx, 'hotel')).toBe(true);
    expect(startingMonthly(idx, 'hotel')).toBe(0);
    expect(isFreeOnly(idx, 'paid')).toBe(false);
  });
});

describe('categories', () => {
  it('has unique ids and labels, including the four added in v1.1', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ['developer', 'finance', 'travel', 'social']) expect(ids).toContain(id);
    expect(categoryLabel('travel')).toBe('Travel & transport');
    expect(categoryLabel('nonsense')).toBe('Other digital services');
  });
});
