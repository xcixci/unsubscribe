import { describe, expect, it } from 'vitest';
import { addDays, addMonths, daysBetween, isIsoDate, nextRenewalOnOrAfter, relativeDays } from '../src/domain/dates';

describe('dates', () => {
  it('validates ISO dates strictly', () => {
    expect(isIsoDate('2026-11-07')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('07/11/2026')).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });

  it('adds months and clamps month ends', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonths('2026-12-10', 12)).toBe('2027-12-10');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-07', '2027-01-30')).toBe(84);
  });

  it('keeps a future renewal date as entered', () => {
    expect(nextRenewalOnOrAfter('2026-12-01', { frequency: 'monthly' }, '2026-11-07')).toBe('2026-12-01');
  });

  it('rolls a past monthly date forward without drifting', () => {
    expect(nextRenewalOnOrAfter('2026-01-31', { frequency: 'monthly' }, '2026-11-07')).toBe('2026-11-30');
    expect(nextRenewalOnOrAfter('2026-10-07', { frequency: 'monthly' }, '2026-11-07')).toBe('2026-11-07');
  });

  it('rolls past annual, quarterly and day-based dates forward', () => {
    expect(nextRenewalOnOrAfter('2024-03-15', { frequency: 'annual' }, '2026-11-07')).toBe('2027-03-15');
    expect(nextRenewalOnOrAfter('2026-01-10', { frequency: 'quarterly' }, '2026-11-07')).toBe('2027-01-10');
    expect(nextRenewalOnOrAfter('2026-10-01', { frequency: 'custom', interval: { unit: 'days', count: 28 } }, '2026-11-07')).toBe('2026-11-26');
  });

  it('describes relative days', () => {
    expect(relativeDays('2026-11-07', '2026-11-07')).toBe('today');
    expect(relativeDays('2026-11-07', '2026-11-08')).toBe('tomorrow');
    expect(relativeDays('2026-11-07', '2026-11-17')).toBe('in 10 days');
    expect(relativeDays('2026-11-07', '2026-11-04')).toBe('3 days ago');
  });
});
