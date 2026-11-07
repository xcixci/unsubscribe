import type { ReactNode } from 'react';
import { useCatalogueState } from '../state/CatalogueContext';

/** Renders children only once the catalogue has loaded; shows loading and error states otherwise. */
export function CatalogueGate({ children }: { children: ReactNode }) {
  const { state, retry } = useCatalogueState();
  if (state.status === 'loading') {
    return (
      <div className="container page" aria-busy="true">
        <span className="visually-hidden" role="status">
          Loading the subscription catalogue
        </span>
        <div className="skeleton" style={{ height: 44, width: '40%', marginBottom: 24 }} />
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 180 }} />
          ))}
        </div>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="container page">
        <div className="state state--error" role="alert">
          <h2>The catalogue didn’t load</h2>
          <p>{state.message} Your saved subscriptions are safe in this browser.</p>
          <button type="button" className="btn" onClick={retry}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
