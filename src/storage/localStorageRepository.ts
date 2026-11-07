import type { PersonalData } from '../domain/types';
import { emptyData, type SubscriptionRepository } from './repository';
import { validatePersonalData } from './validate';

export const STORAGE_KEY = 'unsubscribe:v1:personal-data';

/** Minimal Storage shape so tests can pass an in-memory implementation. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class StorageUnavailableError extends Error {}

export class LocalStorageRepository implements SubscriptionRepository {
  readonly location = 'this browser';

  constructor(private readonly store: KeyValueStore | null = safeLocalStorage()) {}

  async load(): Promise<PersonalData> {
    if (!this.store) return emptyData();
    const raw = this.store.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    try {
      const result = validatePersonalData(JSON.parse(raw));
      if (result.ok) return result.data;
      // Keep the unreadable copy so nothing is silently destroyed.
      this.store.setItem(`${STORAGE_KEY}:unreadable:${Date.now()}`, raw);
      return emptyData();
    } catch {
      this.store.setItem(`${STORAGE_KEY}:unreadable:${Date.now()}`, raw);
      return emptyData();
    }
  }

  async save(data: PersonalData): Promise<void> {
    if (!this.store) throw new StorageUnavailableError('Browser storage is turned off, so changes cannot be saved.');
    try {
      this.store.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new StorageUnavailableError('Your browser refused to save. Storage may be full or blocked in private mode.');
    }
  }

  async clear(): Promise<void> {
    this.store?.removeItem(STORAGE_KEY);
  }
}

function safeLocalStorage(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__unsubscribe_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** In-memory store for tests and as a fallback when storage is blocked. */
export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}
