import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PersonalData, UserSubscription } from '../domain/types';
import type { SubscriptionRepository } from '../storage/repository';
import { emptyData } from '../storage/repository';
import { LocalStorageRepository, MemoryStore, STORAGE_KEY } from '../storage/localStorageRepository';
import { mergeData } from '../storage/validate';

export type NewSubscription = Omit<UserSubscription, 'id' | 'createdAt' | 'updatedAt'>;

interface Value {
  ready: boolean;
  /** False when the browser blocks storage; changes then last only until the tab closes. */
  persistent: boolean;
  location: string;
  subscriptions: UserSubscription[];
  add: (s: NewSubscription) => Promise<UserSubscription>;
  update: (id: string, patch: Partial<NewSubscription>) => Promise<void>;
  remove: (id: string) => Promise<UserSubscription | undefined>;
  restore: (s: UserSubscription) => Promise<void>;
  replaceAll: (data: PersonalData, mode: 'replace' | 'merge') => Promise<void>;
  clearAll: () => Promise<void>;
  exportData: () => PersonalData;
}

const Ctx = createContext<Value | null>(null);

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function storageWorks(): boolean {
  try {
    const k = '__unsubscribe_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function probeRepository(): { repo: SubscriptionRepository; persistent: boolean } {
  // When the browser blocks storage (some private modes), keep data in memory for this tab only.
  return storageWorks()
    ? { repo: new LocalStorageRepository(), persistent: true }
    : { repo: new LocalStorageRepository(new MemoryStore()), persistent: false };
}

export function SubscriptionsProvider({ children, repository }: { children: ReactNode; repository?: SubscriptionRepository }) {
  const setup = useRef(repository ? { repo: repository, persistent: true } : probeRepository());
  const repo = setup.current.repo;
  const [data, setData] = useState<PersonalData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let alive = true;
    repo.load().then((d) => {
      if (alive) {
        setData(d);
        setReady(true);
      }
    });
    // Keep tabs in sync: another tab saving updates this one.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) repo.load().then((d) => alive && setData(d));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [repo]);

  const commit = useCallback(
    async (next: PersonalData) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      setData(stamped);
      await repo.save(stamped);
    },
    [repo],
  );

  const add = useCallback<Value['add']>(
    async (s) => {
      const now = new Date().toISOString();
      const sub: UserSubscription = { ...s, id: newId(), createdAt: now, updatedAt: now };
      await commit({ ...dataRef.current, subscriptions: [...dataRef.current.subscriptions, sub] });
      return sub;
    },
    [commit],
  );

  const update = useCallback<Value['update']>(
    async (id, patch) => {
      const now = new Date().toISOString();
      await commit({
        ...dataRef.current,
        subscriptions: dataRef.current.subscriptions.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: now } : s)),
      });
    },
    [commit],
  );

  const remove = useCallback<Value['remove']>(
    async (id) => {
      const found = dataRef.current.subscriptions.find((s) => s.id === id);
      await commit({ ...dataRef.current, subscriptions: dataRef.current.subscriptions.filter((s) => s.id !== id) });
      return found;
    },
    [commit],
  );

  const restore = useCallback<Value['restore']>(
    async (s) => {
      if (dataRef.current.subscriptions.some((x) => x.id === s.id)) return;
      await commit({ ...dataRef.current, subscriptions: [...dataRef.current.subscriptions, s] });
    },
    [commit],
  );

  const replaceAll = useCallback<Value['replaceAll']>(
    async (incoming, mode) => {
      await commit(mode === 'merge' ? mergeData(dataRef.current, incoming) : incoming);
    },
    [commit],
  );

  const clearAll = useCallback(async () => {
    await repo.clear();
    setData(emptyData());
  }, [repo]);

  const exportData = useCallback(() => dataRef.current, []);

  const value = useMemo<Value>(
    () => ({
      ready,
      persistent: setup.current.persistent,
      location: repo.location,
      subscriptions: data.subscriptions,
      add,
      update,
      remove,
      restore,
      replaceAll,
      clearAll,
      exportData,
    }),
    [ready, repo, data.subscriptions, add, update, remove, restore, replaceAll, clearAll, exportData],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSubscriptions(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSubscriptions must be used inside SubscriptionsProvider');
  return v;
}
