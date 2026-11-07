import { describe, expect, it } from 'vitest';
import { summarise } from '../src/domain/spending';
import { idx, sub } from './fixtures';

describe('spending summary', () => {
  const subs = [
    sub('a', 'netflix', 649, { frequency: 'monthly' }, { planId: 'netflix-premium' }),
    sub('b', 'hotstar', 1099, { frequency: 'annual' }),
    sub('c', 'spotify', 139, { frequency: 'monthly' }, { status: 'considering' }),
    sub('d', 'chatgpt', 1999, { frequency: 'monthly' }, { status: 'cancelled' }),
    sub('e', null, 300, { frequency: 'quarterly' }, { custom: { name: 'Local gym app', category: 'fitness' } }),
  ];
  const s = summarise(subs, idx);

  it('totals monthly and annual spend from the user’s own amounts, excluding cancelled', () => {
    const annual = 649 * 12 + 1099 + 139 * 12 + 300 * 4;
    expect(s.annual).toBeCloseTo(annual, 6);
    expect(s.monthly).toBeCloseTo(annual / 12, 6);
    expect(s.fiveYear).toBeCloseTo(annual * 5, 6);
    expect(s.lines).toHaveLength(4);
  });

  it('keeps “considering cancellation” in totals and reports it separately', () => {
    expect(s.consideringCount).toBe(1);
    expect(s.consideringAnnual).toBeCloseTo(139 * 12, 6);
  });

  it('reports cancelled subscriptions without counting them', () => {
    expect(s.cancelledCount).toBe(1);
    expect(s.cancelledAnnual).toBeCloseTo(1999 * 12, 6);
  });

  it('groups by category with shares that add up to 100%', () => {
    const ott = s.byCategory.find((c) => c.category === 'ott')!;
    expect(ott.count).toBe(2);
    expect(ott.annual).toBeCloseTo(649 * 12 + 1099, 6);
    const totalShare = s.byCategory.reduce((t, c) => t + c.share, 0);
    expect(totalShare).toBeCloseTo(1, 10);
    expect(s.byCategory[0].annual).toBeGreaterThanOrEqual(s.byCategory[1].annual);
  });

  it('uses custom names and categories for custom subscriptions', () => {
    const gym = s.lines.find((l) => l.sub.id === 'e')!;
    expect(gym.name).toBe('Local gym app');
    expect(gym.category).toBe('fitness');
    expect(gym.monthly).toBe(100);
  });

  it('returns zeros for an empty list', () => {
    const empty = summarise([], idx);
    expect(empty.annual).toBe(0);
    expect(empty.byCategory).toEqual([]);
  });
});
