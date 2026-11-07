import { useMemo, useState } from 'react';
import type { CategoryId, Service } from '../domain/types';
import { CATEGORIES } from '../domain/categories';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { Logo } from './Logo';
import { Icon } from './Icon';

export function matchesQuery(s: Service, q: string): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return s.name.toLowerCase().includes(n) || s.description.toLowerCase().includes(n) || s.id.includes(n.replace(/\s+/g, '-'));
}

/** "What do you pay for?" — a fast grid of services, grouped by category. */
export function ServicePicker({ onPick, onCustom }: { onPick: (serviceId: string) => void; onCustom: () => void }) {
  const { catalogue } = useCatalogue();
  const { subscriptions } = useSubscriptions();
  const [q, setQ] = useState('');
  const owned = new Set(subscriptions.map((s) => s.serviceId));
  const active = catalogue.services.filter((s) => s.status === 'active');
  const groups = useMemo(() => {
    const m = new Map<CategoryId, Service[]>();
    for (const s of active.filter((x) => matchesQuery(x, q))) {
      m.set(s.category, [...(m.get(s.category) ?? []), s]);
    }
    return CATEGORIES.filter((c) => m.has(c.id)).map((c) => ({ ...c, services: m.get(c.id)! }));
  }, [active, q]);

  return (
    <div className="picker">
      <div className="search">
        <Icon name="search" />
        <label htmlFor="picker-q" className="visually-hidden">
          Search services
        </label>
        <input id="picker-q" className="input" type="search" placeholder="Search, e.g. Netflix, Canva, Swiggy" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      {groups.length === 0 && (
        <div className="state">
          <h3>No match for “{q}”</h3>
          <p>Add it as a custom subscription instead. It works the same way.</p>
          <button type="button" className="btn" onClick={onCustom}>
            Add “{q}” as custom
          </button>
        </div>
      )}
      {groups.map((g) => (
        <section key={g.id} className="picker__group" aria-label={g.label}>
          <h3 className="picker__title">{g.label}</h3>
          <div className="picker__grid">
            {g.services.map((s) => (
              <button key={s.id} type="button" className="pick" onClick={() => onPick(s.id)}>
                <Logo name={s.name} src={s.logo} size="sm" />
                <span className="pick__name">{s.name}</span>
                {owned.has(s.id) ? <Icon name="check" className="pick__icon" label="In your list" /> : <Icon name="plus" className="pick__icon" />}
              </button>
            ))}
          </div>
        </section>
      ))}
      <button type="button" className="pick pick--custom" onClick={onCustom}>
        <span className="logo logo--sm logo--initials" aria-hidden="true">
          +
        </span>
        <span className="pick__name">Something not listed? Add a custom subscription</span>
      </button>
    </div>
  );
}
