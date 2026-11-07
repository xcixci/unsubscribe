import type { Offer, OfferVerification } from './types';

export const OFFER_STATUS_LABEL: Record<OfferVerification, string> = {
  verified: 'Verified',
  eligibility_needs_confirmation: 'Eligibility needs confirmation',
  expired: 'Expired',
  awaiting_verification: 'Awaiting verification',
};

/** An offer past its end date is expired, whatever the sheet says. */
export function effectiveOfferStatus(offer: Offer, today: string): OfferVerification {
  if (offer.validUntil && offer.validUntil < today) return 'expired';
  return offer.verification;
}

export function isOfferUpcoming(offer: Offer, today: string): boolean {
  return !!offer.validFrom && offer.validFrom > today;
}
