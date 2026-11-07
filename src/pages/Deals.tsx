import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Offer, OfferVerification } from '../domain/types';
import { cycleSuffix } from '../domain/billing';
import { formatDate, todayIso } from '../domain/dates';
import { inr, inrPrice } from '../domain/money';
import { OFFER_STATUS_LABEL, effectiveOfferStatus, isOfferUpcoming } from '../domain/offers';
import { cycleSavings, priceLabel } from '../domain/catalogueQueries';
import { recommendationsFor } from '../domain/recommendations';
import { describeSubscription } from '../domain/spending';
import { useCatalogue } from '../state/CatalogueContext';
import { useSubscriptions } from '../state/SubscriptionsContext';
import { Logo } from '../components/Logo';
import { OfferBadge, VerificationBadge } from '../components/Badges';
import { RecommendationItem } from '../components/Recommendations';

const FILTERS: (OfferVerification | 'all')[] = ['all', 'verified', 'eligibility_needs_confirmation', 'awaiting_verification'];

export function Deals() {
  const { catalogue, index } = useCatalogue();
  const { subscriptions } = useSubscriptions();
  const today = todayIso();
  const [filter, setFilter] = useState<OfferVerification | 'all'>('all');

  const withStatus = catalogue.offers.map((o) => ({ o, status: effectiveOfferStatus(o, today) }));
  const live = withStatus.filter((x) => x.status !== 'expired');
  const expired = withStatus.filter((x) => x.status === 'expired');
  const shown = live.filter((x) => filter === 'all' || x.status === filter);

  const personal = useMemo(() => {
    return subscriptions
      .flatMap((s) => recommendationsFor(s, index, catalogue.offers, catalogue.bundles, today).map((r) => ({ r, s })))
      .filter(({ r }) => r.kind !== 'bundle' && r.kind !== 'price_check' && r.kind !== 'shared_plan' && (r.annualDifference ?? 0) > 0)
      .sort((a, b) => b.r.score - a.r.score)
      .slice(0, 6);
  }, [subscriptions, index, catalogue, today]);

  const savings = cycleSavings(catalogue, index).slice(0, 10);
  const eligibilityPlans = catalogue.plans.filter((p) => p.status === 'active' && p.price !== null && (p.planType === 'student' || p.planType === 'family' || p.planType === 'duo'));

  return (
    <div className="container page">
      <header className="page-head">
        <h1>
          Deals & offers<span className="dot">.</span>
        </h1>
        <p>Promotions, cheaper ways to pay for the same plan, and student and family plans. Every item links to its source and says how sure we are.</p>
      </header>

      <dl className="legend" aria-label="What the labels mean">
        <div>
          <dt>
            <OfferBadge status="verified" />
          </dt>
          <dd>Checked on the official page on the date shown.</dd>
        </div>
        <div>
          <dt>
            <OfferBadge status="eligibility_needs_confirmation" />
          </dt>
          <dd>Real offer, but only some people qualify. Check the conditions.</dd>
        </div>
        <div>
          <dt>
            <OfferBadge status="awaiting_verification" />
          </dt>
          <dd>Reported by a third party. We haven’t confirmed it yet.</dd>
        </div>
        <div>
          <dt>
            <OfferBadge status="expired" />
          </dt>
          <dd>Past its end date. Kept for reference only.</dd>
        </div>
      </dl>

      {personal.length > 0 && (
        <section className="section" aria-labelledby="for-you">
          <div className="section-head">
            <div>
              <h2 id="for-you">For your subscriptions</h2>
              <p>Compared with what you told us you pay. Estimates only — check the official page before switching.</p>
            </div>
            <Link to="/mine" className="link-btn">
              Go to my subscriptions
            </Link>
          </div>
          <ul className="rec-list">
            {personal.map(({ r, s }) => {
              const d = describeSubscription(s, index);
              return <RecommendationItem key={r.id} rec={r} serviceName={d.name} logo={d.service?.logo} />;
            })}
          </ul>
        </section>
      )}

      <section className="section" aria-labelledby="same-plan">
        <div className="section-head">
          <div>
            <h2 id="same-plan">Pay less for the same plan</h2>
            <p>Same features, billed less often. Calculated from listed prices: what a year costs on the dearest cycle versus the cheapest.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Instead of</th>
                <th scope="col">Choose</th>
                <th scope="col" className="num-col">
                  Saves a year
                </th>
                <th scope="col">Prices</th>
              </tr>
            </thead>
            <tbody>
              {savings.map((s) => (
                <tr key={s.longPlan.id}>
                  <th scope="row">
                    <Link to={`/explore/${s.service.id}`} className="table__service">
                      <Logo name={s.service.name} src={s.service.logo} size="sm" />
                      {s.service.name}
                    </Link>
                  </th>
                  <td>
                    {s.shortPlan.name}
                    <span className="table__sub">{inr(s.shortAnnual)} a year</span>
                  </td>
                  <td>
                    {s.longPlan.name}
                    <span className="table__sub">{priceLabel(s.longPlan.price!, s.longPlan.billing)}</span>
                  </td>
                  <td className="num-col num">
                    <strong>{inr(s.saving)}</strong>
                  </td>
                  <td>
                    <VerificationBadge status={s.verified ? 'verified' : 'awaiting_verification'} date={s.verified ? s.longPlan.lastVerified : null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 'var(--s-3)' }}>
          Longer plans are paid upfront and are usually not refundable. Prepaid plans may not renew automatically.
        </p>
      </section>

      <section className="section" aria-labelledby="offers">
        <div className="section-head">
          <div>
            <h2 id="offers">Offers</h2>
            <p>Limited-period prices, first-year discounts and partner offers.</p>
          </div>
        </div>
        <div className="chips" role="group" aria-label="Filter offers">
          {FILTERS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All current' : OFFER_STATUS_LABEL[f]}
              <span className="chip__count">{f === 'all' ? live.length : live.filter((x) => x.status === f).length}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <div className="state">
            <h3>No offers with this label right now</h3>
            <p>New offers are added as they are found and checked.</p>
          </div>
        ) : (
          <div className="card-grid">
            {shown.map(({ o }) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        )}
        {expired.length > 0 && (
          <details className="expired">
            <summary>
              {expired.length} expired {expired.length === 1 ? 'offer' : 'offers'}
            </summary>
            <div className="card-grid">
              {expired.map(({ o }) => (
                <OfferCard key={o.id} offer={o} />
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="section" aria-labelledby="eligible">
        <div className="section-head">
          <div>
            <h2 id="eligible">Student, two-person and family plans</h2>
            <p>Cheaper if you qualify, or if people in your household would otherwise pay separately. Most need proof or a shared address.</p>
          </div>
        </div>
        <ul className="eligible-list">
          {eligibilityPlans.map((p) => {
            const s = index.services.get(p.serviceId)!;
            return (
              <li key={p.id}>
                <Link to={`/explore/${s.id}`} className="table__service">
                  <Logo name={s.name} src={s.logo} size="sm" />
                  <span>
                    <strong>{s.name}</strong> {p.name}
                    <span className="table__sub">{p.planType === 'student' ? 'Students' : p.planType === 'duo' ? 'Two people' : 'Family or household'}</span>
                  </span>
                </Link>
                <span className="num">{priceLabel(p.price!, p.billing)}</span>
                <VerificationBadge status={p.verification} date={p.lastVerified} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function OfferCard({ offer }: { offer: Offer }) {
  const { index } = useCatalogue();
  const today = todayIso();
  const status = effectiveOfferStatus(offer, today);
  const service = index.services.get(offer.serviceId);
  const suffix = offer.billing ? cycleSuffix(offer.billing) : '';
  return (
    <article className={`offer-card${status === 'expired' ? ' offer-card--expired' : ''}`}>
      <div className="offer-card__top">
        {service && (
          <Link to={`/explore/${service.id}`} className="table__service">
            <Logo name={service.name} src={service.logo} size="sm" />
            {service.name}
          </Link>
        )}
        <OfferBadge status={status} />
      </div>
      <h3>{offer.title}</h3>
      {offer.offerPrice !== null && (
        <p className="offer-card__price">
          <span className="num">{offer.offerPrice === 0 ? 'Free' : `${inrPrice(offer.offerPrice)}${suffix}`}</span>
          {offer.originalPrice !== null && (
            <s className="muted num">
              {inrPrice(offer.originalPrice)}
              {suffix}
            </s>
          )}
        </p>
      )}
      <p className="offer-card__desc">{offer.description}</p>
      <dl className="offer-card__facts">
        <div>
          <dt>Who can get it</dt>
          <dd>{offer.eligibility || 'Not stated. Check the official page.'}</dd>
        </div>
        <div>
          <dt>Valid</dt>
          <dd>
            {offer.validUntil
              ? status === 'expired'
                ? `Ended ${formatDate(offer.validUntil)}`
                : `${offer.validFrom ? `From ${formatDate(offer.validFrom)} until` : 'Until'} ${formatDate(offer.validUntil)}`
              : offer.validFrom
                ? `${isOfferUpcoming(offer, today) ? 'Starts' : 'Since'} ${formatDate(offer.validFrom)}, no end date stated`
                : 'No end date stated'}
          </dd>
        </div>
      </dl>
      <div className="meta-list">
        {offer.offerUrl && (
          <a className="ext" href={offer.offerUrl} target="_blank" rel="noopener noreferrer">
            Official offer page
          </a>
        )}
        {offer.sourceUrl && (
          <a className="ext" href={offer.sourceUrl} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        )}
        <span>{offer.lastVerified ? `Last verified ${formatDate(offer.lastVerified)}` : 'Not yet verified'}</span>
      </div>
    </article>
  );
}
