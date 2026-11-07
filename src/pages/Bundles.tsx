import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Bundle } from '../domain/types';
import { cycleLabel, cycleSuffix, monthlyEquivalent } from '../domain/billing';
import { formatDate } from '../domain/dates';
import { inr, inrPrice } from '../domain/money';
import { compareBundle } from '../domain/catalogueQueries';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { Logo } from '../components/Logo';
import { Icon } from '../components/Icon';
import { VerificationBadge } from '../components/Badges';

export function Bundles() {
  const { catalogue } = useCatalogue();
  const active = catalogue.bundles.filter((b) => b.status === 'active');
  const providers = [...new Set(active.map((b) => b.provider))].sort();
  const [provider, setProvider] = useState<string | null>(null);
  const shown = active.filter((b) => !provider || b.provider === provider);

  return (
    <div className="container page">
      <header className="page-head">
        <h1>
          Bundles<span className="dot">.</span>
        </h1>
        <p>Mobile, broadband and TV plans that include subscriptions. Useful if you already pay for the connection — and only then.</p>
      </header>

      <div className="notice" style={{ marginBottom: 'var(--s-5)', maxWidth: 820 }}>
        <Icon name="info" />
        <span>
          <strong>A big “combined value” is not a saving.</strong> The bundle price also pays for calls, data or broadband. We show what the included
          subscriptions would cost on their own so you can compare. It is a real saving only if you would pay for that connection anyway, and the
          included plan is one you would actually choose.
        </span>
      </div>

      {providers.length > 1 && (
        <div className="chips" role="group" aria-label="Filter by provider">
          <button type="button" className="chip" aria-pressed={!provider} onClick={() => setProvider(null)}>
            All providers<span className="chip__count">{active.length}</span>
          </button>
          {providers.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={provider === p} onClick={() => setProvider(provider === p ? null : p)}>
              {p}
              <span className="chip__count">{active.filter((b) => b.provider === p).length}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="state">
          <h2>No bundles listed yet</h2>
          <p>Bundles are added once their details have a source.</p>
        </div>
      ) : (
        <div className="card-grid card-grid--wide">
          {shown.map((b) => (
            <BundleCard key={b.id} bundle={b} />
          ))}
        </div>
      )}
    </div>
  );
}

const listFormat = new Intl.ListFormat('en-IN', { style: 'long', type: 'conjunction' });

/** "Amazon Prime" + "Prime Lite (annual)" → "Amazon Prime Lite (annual)"; "Netflix" + "Basic" → "Netflix Basic". */
export function planDisplayName(service: string, plan: string): string {
  const words = service.split(' ');
  const last = words[words.length - 1];
  if (words.length > 1 && plan.startsWith(last + ' ')) return `${words.slice(0, -1).join(' ')} ${plan}`;
  return plan.toLowerCase().startsWith(service.toLowerCase()) ? plan : `${service} ${plan}`;
}

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const { index } = useCatalogue();
  const { subscriptions } = useSubscriptions();
  const cmp = compareBundle(bundle, index);
  const mine = subscriptions.filter((s) => s.status !== 'cancelled' && s.serviceId && bundle.includedServiceIds.includes(s.serviceId));
  const mineMonthly = mine.reduce((t, s) => t + monthlyEquivalent(s.amount, s.billing), 0);
  const isDays = bundle.billing.frequency === 'custom' && bundle.billing.interval?.unit === 'days';

  return (
    <article className="bundle-card">
      <div className="offer-card__top">
        <span className="bundle-card__provider">{bundle.provider}</span>
        <VerificationBadge status={bundle.verification} date={bundle.lastVerified} />
      </div>
      <h3>{bundle.name}</h3>
      {bundle.price !== null && (
        <p className="offer-card__price">
          <span className="num">
            {inrPrice(bundle.price)}
            {cycleSuffix(bundle.billing)}
          </span>
          {isDays && cmp.bundleMonthly !== null && <span className="muted small">about {inr(cmp.bundleMonthly)} a month</span>}
        </p>
      )}
      <p className="offer-card__desc">{bundle.description}</p>

      <div>
        <h4 className="bundle-card__label">Includes</h4>
        <ul className="bundle-card__services">
          {bundle.includedServiceIds.map((id) => {
            const s = index.services.get(id);
            if (!s) return null;
            const tracked = mine.some((m) => m.serviceId === id);
            return (
              <li key={id}>
                <Link to={`/explore/${id}`} className="table__service">
                  <Logo name={s.name} src={s.logo} size="sm" />
                  {s.name}
                </Link>
                {tracked && <span className="badge badge--neutral">You pay for this</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bundle-card__compare">
        {cmp.pricedPlans.length > 0 ? (
          <>
            <p>
              Bought separately, {listFormat.format(cmp.pricedPlans.map((p) => planDisplayName(index.services.get(p.serviceId)?.name ?? '', p.name)))} would cost about{' '}
              <strong className="num">{inr(cmp.pricedMonthly)} a month</strong> at listed prices.
            </p>
            {cmp.unpricedServiceIds.length > 0 && (
              <p className="small muted">
                {cmp.unpricedServiceIds.length} more included {cmp.unpricedServiceIds.length === 1 ? 'service isn’t' : 'services aren’t'} priced here because the exact plan isn’t stated.
              </p>
            )}
          </>
        ) : (
          <p className="small muted">The exact plans included aren’t stated, so we can’t price them like-for-like.</p>
        )}
        {mine.length > 0 && (
          <p className="small">
            You currently pay <strong className="num">{inr(mineMonthly)} a month</strong> for {mine.length} of these. Compare that, plus your current{' '}
            {bundle.provider} bill, with this bundle’s price.
          </p>
        )}
      </div>

      <dl className="offer-card__facts">
        <div>
          <dt>Who can get it</dt>
          <dd>{bundle.eligibility || 'Not stated. Check the official page.'}</dd>
        </div>
        <div>
          <dt>Billing</dt>
          <dd>
            {bundle.price !== null ? `${inrPrice(bundle.price)} ${cycleLabel(bundle.billing)}` : 'Not stated'}
            {bundle.notes ? `. ${bundle.notes}` : ''}
          </dd>
        </div>
      </dl>
      <div className="meta-list">
        {bundle.offerUrl && (
          <a className="ext" href={bundle.offerUrl} target="_blank" rel="noopener noreferrer">
            Official page
          </a>
        )}
        {bundle.sourceUrl && (
          <a className="ext" href={bundle.sourceUrl} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        )}
        <span>{bundle.lastVerified ? `Last verified ${formatDate(bundle.lastVerified)}` : 'Not yet verified'}</span>
      </div>
    </article>
  );
}
