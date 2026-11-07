import type { PersonalData } from '../domain/types';

/**
 * Where a visitor's personal subscription list lives.
 *
 * v1 ships only LocalStorageRepository. A future cloud-sync release can add
 * e.g. an ApiRepository implementing this same interface; the rest of the
 * app talks only to this interface (via state/SubscriptionsProvider).
 */
export interface SubscriptionRepository {
  /** Human-readable description shown in the UI, e.g. "this browser". */
  readonly location: string;
  load(): Promise<PersonalData>;
  save(data: PersonalData): Promise<void>;
  clear(): Promise<void>;
}

export function emptyData(now = new Date()): PersonalData {
  return { app: 'unsubscribe', schemaVersion: 1, updatedAt: now.toISOString(), subscriptions: [] };
}
