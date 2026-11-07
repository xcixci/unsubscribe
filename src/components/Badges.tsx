import type { OfferVerification, PlanVerification, SubscriptionStatus } from '../domain/types';
import { formatDate } from '../domain/dates';
import { OFFER_STATUS_LABEL } from '../domain/offers';
import { Icon } from './Icon';

export function VerificationBadge({ status, date }: { status: PlanVerification; date?: string | null }) {
  if (status === 'verified') {
    return (
      <span className="badge badge--verified" title="Checked against the official page">
        <Icon name="check" />
        Verified{date ? ` ${formatDate(date)}` : ''}
      </span>
    );
  }
  return (
    <span className="badge badge--awaiting" title="Reported by a third party. Not yet checked on the official page.">
      Awaiting verification
    </span>
  );
}

export function OfferBadge({ status }: { status: OfferVerification }) {
  const cls = {
    verified: 'badge--verified',
    eligibility_needs_confirmation: 'badge--eligibility',
    expired: 'badge--expired',
    awaiting_verification: 'badge--awaiting',
  }[status];
  return (
    <span className={`badge ${cls}`}>
      {status === 'verified' && <Icon name="check" />}
      {OFFER_STATUS_LABEL[status]}
    </span>
  );
}

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: 'Wanted',
  considering: 'Considering cancelling',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  return <span className={`badge badge--status-${status}`}>{STATUS_LABEL[status]}</span>;
}
