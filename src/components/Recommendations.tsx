import { Link } from 'react-router-dom';
import type { Recommendation, Tradeoff } from '../domain/recommendations';
import { inr } from '../domain/money';
import { cycleSuffix } from '../domain/billing';
import { inrPrice } from '../domain/money';
import { Logo } from './Logo';
import { VerificationBadge } from './Badges';

const TRADEOFF: Record<Tradeoff, string> = {
  none: 'Same features',
  upfront: 'Same features, paid upfront',
  fewer_features: 'Fewer features',
  eligibility: 'Only if you qualify',
  sharing: 'Needs people to share with',
  bundle: 'Comes with a connection',
  info: 'Worth checking',
};

export function RecommendationItem({ rec, serviceName, logo }: { rec: Recommendation; serviceName?: string; logo?: string | null }) {
  const diff = rec.annualDifference;
  const price = rec.plan?.price != null ? `${inrPrice(rec.plan.price)}${cycleSuffix(rec.plan.billing)}` : null;
  return (
    <li className="rec">
      {serviceName && <Logo name={serviceName} src={logo} size="sm" />}
      <div className="rec__body">
        <div className="rec__title">
          {serviceName && <span className="rec__service">{serviceName}: </span>}
          {rec.title}
        </div>
        <p className="rec__detail">{rec.detail}</p>
        {rec.plan && rec.kind !== 'price_check' && rec.plan.features.length > 0 && (
          <p className="small muted">Includes: {rec.plan.features.join('; ')}</p>
        )}
        <div className="rec__meta">
          <span className={`badge ${rec.tradeoff === 'fewer_features' ? 'badge--status-considering' : 'badge--neutral'}`}>{TRADEOFF[rec.tradeoff]}</span>
          {rec.offer ? (
            <span className={`badge ${rec.verified ? 'badge--verified' : 'badge--awaiting'}`}>{rec.verified ? 'Verified offer' : 'Awaiting verification'}</span>
          ) : rec.plan ? (
            <VerificationBadge status={rec.plan.verification} date={rec.plan.lastVerified} />
          ) : rec.bundle ? (
            <VerificationBadge status={rec.bundle.verification} date={rec.bundle.lastVerified} />
          ) : null}
          {rec.plan && (
            <Link className="small" to={`/explore/${rec.plan.serviceId}`}>
              Compare plans
            </Link>
          )}
          {rec.offer?.offerUrl && (
            <a className="small ext" href={rec.offer.offerUrl} target="_blank" rel="noopener noreferrer">
              Official offer page
            </a>
          )}
          {rec.bundle && (
            <Link className="small" to="/bundles">
              See bundle
            </Link>
          )}
        </div>
      </div>
      <div className="rec__money">
        {rec.kind === 'price_check' ? (
          price && (
            <>
              <span className="num">{price}</span>
              <small>listed today</small>
            </>
          )
        ) : diff !== null && diff > 0 ? (
          <>
            <span className={`num${rec.tradeoff === 'fewer_features' ? '' : ' rec__save'}`}>
              {rec.tradeoff === 'fewer_features' ? `${inr(diff)} less` : `Save about ${inr(diff)}`}
            </span>
            <small>a year, estimated</small>
          </>
        ) : rec.annualCost !== null ? (
          <>
            <span className="num">{inr(rec.annualCost)}</span>
            <small>a year</small>
          </>
        ) : null}
      </div>
    </li>
  );
}
