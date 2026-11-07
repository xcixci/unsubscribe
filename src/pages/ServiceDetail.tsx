import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Plan } from '../domain/types';
import { annualEquivalent, cycleLabel, monthlyEquivalent } from '../domain/billing';
import { categoryLabel } from '../domain/categories';
import { formatDate, todayIso } from '../domain/dates';
import { inr, inrPrice } from '../domain/money';
import { effectiveOfferStatus } from '../domain/offers';
import { activePlans } from '../domain/catalogueQueries';
import { useCatalogue } from '../state/CatalogueContext';
import { Logo } from '../components/Logo';
import { Icon } from '../components/Icon';
import { VerificationBadge } from '../components/Badges';
import { SubscriptionForm, type FormMode } from '../components/SubscriptionForm';
import { OfferCard } from './Deals';
import { BundleCard } from './Bundles';
import { NotFound } from './NotFound';

export function ServiceDetail() {
  const { serviceId = '' } = useParams();
  const { catalogue, index } = useCatalogue();
  const [form, setForm] = useState<FormMode | null>(null);
  const service = index.services.get(serviceId);
  if (!service) return <NotFound what="That subscription isn’t in the catalogue." />;

  const plans = activePlans(index, service.id);
  const today = todayIso();
  const offers = catalogue.offers.filter((o) => o.serviceId === service.id).sort((a, b) => Number(effectiveOfferStatus(a, today) === 'expired') - Number(effectiveOfferStatus(b, today) === 'expired'));
  const bundles = catalogue.bundles.filter((b) => b.status === 'active' && b.includedServiceIds.includes(service.id));

  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/explore">Explore</Link>
        <Icon name="chevron" />
        <Link to={`/explore?cat=${service.category}`}>{categoryLabel(service.category)}</Link>
      </nav>
      <header className="detail-head">
        <Logo name={service.name} src={service.logo} size="lg" />
        <div className="detail-head__text">
          <h1>{service.name}</h1>
          <p>{service.description}</p>
          <div className="meta-list">
            <a className="ext" href={service.websiteUrl} target="_blank" rel="noopener noreferrer">
              Official website
            </a>
            {service.lastUpdated && <span>Listing updated {formatDate(service.lastUpdated)}</span>}
          </div>
          {service.notes && (
            <div className="notice" style={{ marginTop: 'var(--s-3)' }}>
              <Icon name="info" />
              <span>{service.notes}</span>
            </div>
          )}
        </div>
        <button type="button" className="btn detail-head__cta" onClick={() => setForm({ kind: 'add', serviceId: service.id })}>
          <Icon name="plus" />
          Add to my list
        </button>
      </header>

      <section className="section" aria-labelledby="plans-title" style={{ marginTop: 'var(--s-7)' }}>
        <div className="section-head">
          <div>
            <h2 id="plans-title">Plans and listed prices</h2>
            <p>Listed prices are what new subscribers are charged, in rupees. What you pay may differ — you enter your own amount when you add it.</p>
          </div>
        </div>
        {plans.length === 0 ? (
          <div className="state">
            <h3>No plans listed yet</h3>
            <p>You can still add {service.name} with the amount you pay.</p>
          </div>
        ) : (
          <div className="plan-list">
            {plans.map((p) => (
              <PlanRow key={p.id} plan={p} onAdd={() => setForm({ kind: 'add', serviceId: service.id, planId: p.id })} />
            ))}
          </div>
        )}
      </section>

      {offers.length > 0 && (
        <section className="section" aria-labelledby="offers-title">
          <div className="section-head">
            <h2 id="offers-title">Offers for {service.name}</h2>
          </div>
          <div className="card-grid">
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      {bundles.length > 0 && (
        <section className="section" aria-labelledby="bundles-title">
          <div className="section-head">
            <div>
              <h2 id="bundles-title">Bundles that include {service.name}</h2>
              <p>These come with a mobile or broadband plan, so they are not a direct saving.</p>
            </div>
          </div>
          <div className="card-grid">
            {bundles.map((b) => (
              <BundleCard key={b.id} bundle={b} />
            ))}
          </div>
        </section>
      )}

      <SubscriptionForm mode={form} onClose={() => setForm(null)} />
    </div>
  );
}

function PlanRow({ plan, onAdd }: { plan: Plan; onAdd: () => void }) {
  return (
    <article className="plan-row">
      <div className="plan-row__main">
        <h3>{plan.name}</h3>
        {plan.features.length > 0 && (
          <ul className="features">
            {plan.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        {plan.notes && <p className="small muted">{plan.notes}</p>}
      </div>
      <dl className="plan-row__money">
        {plan.price !== null ? (
          <>
            <div>
              <dt>Listed price</dt>
              <dd className="num plan-row__price">
                {inrPrice(plan.price)} <span>{cycleLabel(plan.billing)}</span>
              </dd>
            </div>
            <div>
              <dt>Monthly equivalent</dt>
              <dd className="num">{inr(monthlyEquivalent(plan.price, plan.billing))}</dd>
            </div>
            <div>
              <dt>Annual equivalent</dt>
              <dd className="num">{inr(annualEquivalent(plan.price, plan.billing))}</dd>
            </div>
          </>
        ) : (
          <div>
            <dt>Listed price</dt>
            <dd>Not listed — billed {cycleLabel(plan.billing)}</dd>
          </div>
        )}
      </dl>
      <div className="plan-row__side">
        <div className="plan-row__verify">
          {plan.price !== null && <VerificationBadge status={plan.verification} date={plan.lastVerified} />}
          <div className="meta-list">
            {plan.planUrl && (
              <a className="ext" href={plan.planUrl} target="_blank" rel="noopener noreferrer">
                Official plan page
              </a>
            )}
            {plan.priceSourceUrl && (
              <a className="ext" href={plan.priceSourceUrl} target="_blank" rel="noopener noreferrer">
                Price source
              </a>
            )}
            <span>{plan.lastVerified ? `Last verified ${formatDate(plan.lastVerified)}` : 'Not yet verified'}</span>
          </div>
        </div>
        <button type="button" className="btn btn--ghost btn--small" onClick={onAdd}>
          <Icon name="plus" />
          Add this plan
        </button>
      </div>
    </article>
  );
}
