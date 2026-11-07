import { describe, expect, it } from 'vitest';
import {
  annualEquivalent,
  cycleFromColumns,
  cycleLabel,
  cyclesPerYear,
  monthlyEquivalent,
  projectedCost,
  validateCycle,
} from '../src/domain/billing';
import type { BillingCycle } from '../src/domain/types';

const monthly: BillingCycle = { frequency: 'monthly' };
const quarterly: BillingCycle = { frequency: 'quarterly' };
const half: BillingCycle = { frequency: 'half_yearly' };
const annual: BillingCycle = { frequency: 'annual' };
const days28: BillingCycle = { frequency: 'custom', interval: { unit: 'days', count: 28 } };
const days84: BillingCycle = { frequency: 'custom', interval: { unit: 'days', count: 84 } };
const months2: BillingCycle = { frequency: 'custom', interval: { unit: 'months', count: 2 } };

describe('billing conversions', () => {
  it('monthly price × 12 = annual equivalent', () => {
    expect(annualEquivalent(649, monthly)).toBe(7788);
    expect(monthlyEquivalent(649, monthly)).toBe(649);
  });

  it('quarterly price ÷ 3 = monthly equivalent', () => {
    expect(monthlyEquivalent(699, quarterly)).toBeCloseTo(233, 6);
    expect(annualEquivalent(699, quarterly)).toBe(2796);
  });

  it('half-yearly price ÷ 6 = monthly equivalent', () => {
    expect(monthlyEquivalent(1200, half)).toBe(200);
    expect(annualEquivalent(1200, half)).toBe(2400);
  });

  it('annual price ÷ 12 = monthly equivalent, and is never treated as monthly', () => {
    expect(monthlyEquivalent(1499, annual)).toBeCloseTo(124.9167, 3);
    expect(annualEquivalent(1499, annual)).toBe(1499);
  });

  it('28-day packs bill about 13 times a year, not 12', () => {
    expect(cyclesPerYear(days28)).toBeCloseTo(365 / 28, 10);
    expect(annualEquivalent(349, days28)).toBeCloseTo((349 * 365) / 28, 6);
    expect(annualEquivalent(349, days28)).toBeGreaterThan(349 * 12);
  });

  it('84-day packs annualise by days', () => {
    expect(annualEquivalent(1299, days84)).toBeCloseTo((1299 * 365) / 84, 6);
    expect(monthlyEquivalent(1299, days84)).toBeCloseTo((1299 * 365) / 84 / 12, 6);
  });

  it('custom month cycles divide by the month count', () => {
    expect(monthlyEquivalent(300, months2)).toBe(150);
    expect(annualEquivalent(300, months2)).toBe(1800);
  });

  it('five-year projection is five annual equivalents', () => {
    expect(projectedCost(149, monthly, 5)).toBe(149 * 12 * 5);
    expect(projectedCost(1099, annual, 5)).toBe(5495);
  });

  it('handles zero, negative and non-finite amounts safely', () => {
    expect(annualEquivalent(0, monthly)).toBe(0);
    expect(annualEquivalent(-5, monthly)).toBe(0);
    expect(annualEquivalent(Number.NaN, monthly)).toBe(0);
  });

  it('keeps paise precision for prices like ₹638.38', () => {
    expect(annualEquivalent(638.38, monthly)).toBeCloseTo(7660.56, 6);
  });
});

describe('cycle validation and labels', () => {
  it('rejects bad custom cycles', () => {
    expect(validateCycle({ frequency: 'custom' })).not.toBeNull();
    expect(validateCycle({ frequency: 'custom', interval: { unit: 'days', count: 0 } })).not.toBeNull();
    expect(validateCycle({ frequency: 'custom', interval: { unit: 'days', count: 2.5 } })).not.toBeNull();
    expect(validateCycle(days84)).toBeNull();
    expect(validateCycle(monthly)).toBeNull();
  });

  it('labels cycles in plain words', () => {
    expect(cycleLabel(monthly)).toBe('per month');
    expect(cycleLabel(quarterly)).toBe('every 3 months');
    expect(cycleLabel(annual)).toBe('per year');
    expect(cycleLabel(days84)).toBe('every 84 days');
  });

  it('reads catalogue columns', () => {
    expect(cycleFromColumns('Monthly')).toEqual(monthly);
    expect(cycleFromColumns('half-yearly')).toEqual(half);
    expect(cycleFromColumns('yearly')).toEqual(annual);
    expect(cycleFromColumns('custom', null, 84)).toEqual(days84);
    expect(cycleFromColumns('custom', 2, null)).toEqual(months2);
    expect(cycleFromColumns('custom')).toBeNull();
    expect(cycleFromColumns('fortnightly')).toBeNull();
  });
});
