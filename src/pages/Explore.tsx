import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { CategoryId, Service } from '../domain/types';
import { CATEGORIES, CATEGORY_IDS, categoryLabel, isCategoryId } from '../domain/categories';
import { activePlans, byPopularity, isFreeOnly, popularByCategory, startingMonthly, startingPlan } from '../domain/catalogueQueries';
import { inr } from '../domain/money';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { Logo } from '../components/Logo';
import { Icon } from '../components/Icon';
import { VerificationBadge } from '../components/Badges';
import { SubscriptionForm, type FormMode } from '../components/SubscriptionForm';
import { matchesQuery } from '../components/ServicePicker';

type Sort = 'popular' | 'name' | 'price-asc' | 'price-desc' | 'category';

/** How many cards Explore shows before "Show more". */
export const PAGE_SIZE = 24;
/** How many of each category's most popular services the Explore front page shows. */
export const PER_CATEGORY = 3;

export function Explore() {
  const { catalogue, index } = useCatalogue();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const catParam = params.get('cat');
  const cat: CategoryId | null = isCategoryId(catParam) ? catParam : null;
  const sort = (['name', 'price-asc', 'price-desc', 'category'].includes(params.get('sort') ?? '') ? params.get('sort') : 'popular') as Sort;
  const [form, setForm] = useState<FormMode | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);
  // A new search, filter or sort starts from the first page again.
  useEffect(() => setShown(PAGE_SIZE), [q, cat, sort]);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const active = catalogue.services.filter((s) => s.status === 'active');
  const counts = useMemo(() => {
    const m = new Map<CategoryId, number>();
    for (const s of active.filter((x) => matchesQuery(x, q))) m.set(s.category, (m.get(s.category) ?? 0) + 1);
    return m;
  }, [active, q]);

  const results = useMemo(() => {
    const list = active.filter((s) => matchesQuery(s, q) && (!cat || s.category === cat));
    const price = (s: Service) => startingMonthly(index, s.id);
    return [...list].sort((a, b) => {
      if (sort === 'category') return categoryLabel(a.category).localeCompare(categoryLabel(b.category)) || a.name.localeCompare(b.name);
      if (sort === 'price-asc' || sort === 'price-desc') {
        const pa = price(a);
        const pb = price(b);
        if (pa === null && pb === null) return a.name.localeCompare(b.name);
        if (pa === null) return 1;
        if (pb === null) return -1;
        return sort === 'price-asc' ? pa - pb : pb - pa;
      }
      if (sort === 'popular') return byPopularity(a, b);
      return a.name.localeCompare(b.name);
    });
  }, [active, q, cat, sort, index]);

  // With no search, filter or custom sort, Explore opens on each category's most popular services.
  const grouped = !q && !cat && sort === 'popular';
  const groups = useMemo(() => (grouped ? popularByCategory(active, CATEGORY_IDS, PER_CATEGORY) : []), [grouped, active]);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>
          Explore subscriptions<span className="dot">.</span>
        </h1>
        <p>
          {active.length} digital subscriptions available in India, with plans, listed prices and where each price came from. Add the ones you pay for.
        </p>
      </header>

      <div className="toolbar" role="search">
        <div className="search">
          <Icon name="search" />
          <label htmlFor="explore-q" className="visually-hidden">
            Search subscriptions
          </label>
          <input id="explore-q" className="input" type="search" value={q} placeholder="Search Netflix, Canva, Swiggy…" onChange={(e) => set('q', e.target.value || null)} autoComplete="off" />
        </div>
        <div className="field toolbar__sort">
          <label htmlFor="explore-sort" className="visually-hidden">
            Sort by
          </label>
          <select id="explore-sort" className="select" value={sort} onChange={(e) => set('sort', e.target.value === 'popular' ? null : e.target.value)}>
            <option value="popular">Sort: Popular first</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="price-asc">Sort: Lowest starting price</option>
            <option value="price-desc">Sort: Highest starting price</option>
            <option value="category">Sort: Category</option>
          </select>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Filter by category">
        <button type="button" className="chip" aria-pressed={!cat} onClick={() => set('cat', null)}>
          All<span className="chip__count">{[...counts.values()].reduce((a, b) => a + b, 0)}</span>
        </button>
        {CATEGORIES.filter((c) => counts.has(c.id) || c.id === cat).map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => set('cat', cat === c.id ? null : c.id)}>
            {c.label}
            <span className="chip__count">{counts.get(c.id) ?? 0}</span>
          </button>
        ))}
      </div>

      <p className="results-count" aria-live="polite">
        {grouped ? `The most popular in each category. Pick a category to see all ${active.length}.` : results.length === 0 ? 'No subscriptions match.' : `${results.length} ${results.length === 1 ? 'subscription' : 'subscriptions'}`}
        {cat ? ` in ${categoryLabel(cat)}` : ''}
        {q ? ` for “${q}”` : ''}
      </p>

      {grouped ? (
        <>
          {groups.map((g) => (
            <section key={g.category} className="explore-group" aria-labelledby={`group-${g.category}`}>
              <div className="explore-group__head">
                <h2 id={`group-${g.category}`}>{categoryLabel(g.category)}</h2>
                {g.total > g.top.length && (
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => set('cat', g.category)}>
                    See all {g.total}
                  </button>
                )}
              </div>
              <div className="service-grid explore-group__grid">
                {g.top.map((s) => (
                  <ServiceCard key={s.id} service={s} nested onAdd={() => setForm({ kind: 'add', serviceId: s.id })} />
                ))}
              </div>
            </section>
          ))}
          <div className="service-grid explore-group__grid explore-group--custom">
            <article className="service-card service-card--custom">
            <h2 className="service-card__name">Not listed?</h2>
            <p className="muted">Add any subscription — a local gym, a newspaper, a SaaS tool — with its name, category and what you pay.</p>
            <button type="button" className="btn btn--ghost" onClick={() => setForm({ kind: 'add', serviceId: null })}>
              <Icon name="plus" />
              Add a custom subscription
            </button>
          </article>
          </div>
        </>
      ) : results.length === 0 ? (
        <div className="state">
          <h2>Nothing matches “{q}”</h2>
          <p>Try a shorter search, or add it yourself as a custom subscription. Custom subscriptions are counted exactly like listed ones.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn" onClick={() => setForm({ kind: 'add', serviceId: null })}>
              <Icon name="plus" />
              Add a custom subscription
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <>
        <div className="service-grid">
          {results.slice(0, shown).map((s) => (
            <ServiceCard key={s.id} service={s} onAdd={() => setForm({ kind: 'add', serviceId: s.id })} />
          ))}
          <article className="service-card service-card--custom">
            <h2 className="service-card__name">Not listed?</h2>
            <p className="muted">Add any subscription — a local gym, a newspaper, a SaaS tool — with its name, category and what you pay.</p>
            <button type="button" className="btn btn--ghost" onClick={() => setForm({ kind: 'add', serviceId: null })}>
              <Icon name="plus" />
              Add a custom subscription
            </button>
          </article>
        </div>
        {results.length > shown && (
          <div className="show-more">
            <p className="muted small">
              Showing {shown} of {results.length}. Search or pick a category to find one faster.
            </p>
            <button type="button" className="btn btn--ghost" onClick={() => setShown((n) => n + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, results.length - shown)} more
            </button>
          </div>
        )}
        </>
      )}

      <SubscriptionForm mode={form} onClose={() => setForm(null)} />
    </div>
  );
}

function ServiceCard({ service, onAdd, nested = false }: { service: Service; onAdd: () => void; nested?: boolean }) {
  const Name = nested ? 'h3' : 'h2';
  const { index } = useCatalogue();
  const { subscriptions } = useSubscriptions();
  const plans = activePlans(index, service.id);
  const start = startingPlan(index, service.id);
  const startMonthly = startingMonthly(index, service.id);
  const owned = subscriptions.some((x) => x.serviceId === service.id && x.status !== 'cancelled');

  return (
    <article className="service-card">
      <div className="service-card__top">
        <Logo name={service.name} src={service.logo} />
        <div>
          <Name className="service-card__name">
            <Link to={`/explore/${service.id}`}>{service.name}</Link>
          </Name>
          <span className="service-card__cat">{categoryLabel(service.category)}</span>
        </div>
        {owned && (
          <span className="badge badge--neutral service-card__owned">
            <Icon name="check" />
            In your list
          </span>
        )}
      </div>
      <p className="service-card__desc">{service.description}</p>
      <div className="service-card__price">
        {isFreeOnly(index, service.id) ? (
          <span>
            <strong>Free to join</strong>
          </span>
        ) : start && startMonthly !== null ? (
          <>
            <span>
              From <strong className="num">{inr(startMonthly)}</strong>
              <span className="muted"> a month</span>
            </span>
            <VerificationBadge status={start.verification} date={start.lastVerified} />
          </>
        ) : (
          <span className="muted">Price not listed yet — enter what you pay</span>
        )}
      </div>
      <div className="service-card__actions">
        <Link className="btn btn--ghost btn--smallall" to={`/explore/${service.id}`}>
          {plans.length ? `View ${plans.length} ${plans.length === 1 ? 'plan' : 'plans'}` : 'View details'}
        </Link>
        <button type="button" className="btn btn--small" onClick={onAdd} aria-label={`Add ${service.name} to my subscriptions`}>
          <Icon name="plus" />
          Add
        </button>
      </div>
    </article>
  );
}
