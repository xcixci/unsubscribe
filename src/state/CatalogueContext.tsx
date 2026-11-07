import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Catalogue } from '../domain/types';
import { CatalogueError, loadCatalogue } from '../data/catalogue';
import { indexCatalogue, type CatalogueIndex } from '../domain/spending';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; catalogue: Catalogue; index: CatalogueIndex };

interface Value {
  state: State;
  retry: () => void;
}

const Ctx = createContext<Value | null>(null);

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    loadCatalogue(ctrl.signal)
      .then((catalogue) => setState({ status: 'ready', catalogue, index: indexCatalogue(catalogue) }))
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setState({ status: 'error', message: e instanceof CatalogueError ? e.message : 'The catalogue could not be loaded.' });
      });
    return () => ctrl.abort();
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const value = useMemo(() => ({ state, retry }), [state, retry]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalogueState(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCatalogueState must be used inside CatalogueProvider');
  return v;
}

/** For components rendered only once the catalogue is ready (see <CatalogueGate>). */
export function useCatalogue(): { catalogue: Catalogue; index: CatalogueIndex } {
  const { state } = useCatalogueState();
  if (state.status !== 'ready') throw new Error('Catalogue not ready');
  return { catalogue: state.catalogue, index: state.index };
}
