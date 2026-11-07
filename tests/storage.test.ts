import { describe, expect, it } from 'vitest';
import { LocalStorageRepository, MemoryStore, STORAGE_KEY } from '../src/storage/localStorageRepository';
import { looksSensitive, mergeData, validatePersonalData } from '../src/storage/validate';
import { emptyData } from '../src/storage/repository';
import { sub } from './fixtures';

const backup = (subs: unknown[]) => ({ app: 'unsubscribe', schemaVersion: 1, updatedAt: '2026-11-07T00:00:00Z', subscriptions: subs });

describe('local storage repository', () => {
  it('saves and loads data (persists across reloads)', async () => {
    const store = new MemoryStore();
    const repo = new LocalStorageRepository(store);
    const data = { ...emptyData(), subscriptions: [sub('a', 'netflix', 649, { frequency: 'monthly' })] };
    await repo.save(data);
    const reloaded = await new LocalStorageRepository(store).load();
    expect(reloaded.subscriptions).toHaveLength(1);
    expect(reloaded.subscriptions[0].amount).toBe(649);
  });

  it('keeps an unreadable copy instead of destroying it', async () => {
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, '{not json');
    const data = await new LocalStorageRepository(store).load();
    expect(data.subscriptions).toEqual([]);
    expect(store.getItem(STORAGE_KEY)).toBe('{not json');
  });

  it('clears all data', async () => {
    const store = new MemoryStore();
    const repo = new LocalStorageRepository(store);
    await repo.save({ ...emptyData(), subscriptions: [sub('a', 'netflix', 1, { frequency: 'monthly' })] });
    await repo.clear();
    expect(store.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('import validation', () => {
  it('accepts a valid backup', () => {
    const r = validatePersonalData(backup([sub('a', 'netflix', 649, { frequency: 'monthly' }, { nextRenewal: '2026-12-01', reminderOffsets: [1, 3] })]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.subscriptions[0].nextRenewal).toBe('2026-12-01');
      expect(r.data.subscriptions[0].reminderOffsets).toEqual([1, 3]);
    }
  });

  it('rejects files that are not UNSUBSCRIBE backups', () => {
    expect(validatePersonalData({ foo: 1 }).ok).toBe(false);
    expect(validatePersonalData(null).ok).toBe(false);
    expect(validatePersonalData({ ...backup([]), schemaVersion: 2 }).ok).toBe(false);
  });

  it('rejects invalid amounts, cycles and duplicate ids', () => {
    expect(validatePersonalData(backup([{ ...sub('a', 'x', -1, { frequency: 'monthly' }) }])).ok).toBe(false);
    expect(validatePersonalData(backup([{ ...sub('a', 'x', 1, { frequency: 'monthly' }), billing: { frequency: 'weekly' } }])).ok).toBe(false);
    expect(validatePersonalData(backup([sub('a', 'x', 1, { frequency: 'monthly' }), sub('a', 'y', 1, { frequency: 'monthly' })])).ok).toBe(false);
  });

  it('requires a name for custom subscriptions', () => {
    expect(validatePersonalData(backup([sub('a', null, 1, { frequency: 'monthly' })])).ok).toBe(false);
    const ok = validatePersonalData(backup([sub('a', null, 1, { frequency: 'monthly' }, { custom: { name: 'Gym', category: 'fitness' } })]));
    expect(ok.ok).toBe(true);
  });

  it('drops invalid dates and unknown fields without failing', () => {
    const r = validatePersonalData(backup([{ ...sub('a', 'netflix', 1, { frequency: 'monthly' }), nextRenewal: '31/12/2026', evil: '<script>' }]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.subscriptions[0].nextRenewal).toBeUndefined();
      expect('evil' in r.data.subscriptions[0]).toBe(false);
    }
  });

  it('strips notes that look like card or account numbers', () => {
    const r = validatePersonalData(backup([sub('a', 'netflix', 1, { frequency: 'monthly' }, { notes: 'card 4111 1111 1111 1111' })]));
    expect(r.ok && r.data.subscriptions[0].notes).toBeFalsy();
    expect(r.ok && r.warnings.length).toBe(1);
  });

  it('merges imported items by id', () => {
    const current = { ...emptyData(), subscriptions: [sub('a', 'netflix', 649, { frequency: 'monthly' }), sub('b', 'spotify', 139, { frequency: 'monthly' })] };
    const incoming = { ...emptyData(), subscriptions: [sub('b', 'spotify', 69, { frequency: 'monthly' }), sub('c', 'chatgpt', 399, { frequency: 'monthly' })] };
    const merged = mergeData(current, incoming);
    expect(merged.subscriptions.map((s) => s.id).sort()).toEqual(['a', 'b', 'c']);
    expect(merged.subscriptions.find((s) => s.id === 'b')!.amount).toBe(69);
  });
});

describe('sensitive data detection', () => {
  it('flags card, account and OTP-like text', () => {
    expect(looksSensitive('4111-1111-1111-1111')).toBe(true);
    expect(looksSensitive('acct 123456789012')).toBe(true);
    expect(looksSensitive('my otp is 1234')).toBe(true);
    expect(looksSensitive('HDFC card ending 4417')).toBe(false);
    expect(looksSensitive('Shared with Priya, renews ₹1,49,900')).toBe(false);
  });
});
