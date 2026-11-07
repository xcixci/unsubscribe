/**
 * Core domain types for UNSUBSCRIBE.
 *
 * Catalogue types describe public, publishable data generated from the
 * Google Sheets master catalogue (see docs/catalogue.md).
 * Personal types describe what a visitor stores in their own browser.
 */

export type CategoryId =
  | 'ott'
  | 'music'
  | 'ai'
  | 'productivity'
  | 'design'
  | 'developer'
  | 'cloud'
  | 'gaming'
  | 'education'
  | 'news'
  | 'fitness'
  | 'shopping'
  | 'food'
  | 'travel'
  | 'finance'
  | 'social'
  | 'security'
  | 'other';

export type BillingFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'custom';

/** A billing cycle. `custom` cycles carry an explicit interval, e.g. 84 days. */
export interface BillingCycle {
  frequency: BillingFrequency;
  /** Only for `custom`. */
  interval?: { unit: 'days' | 'months'; count: number };
}

export type PlanVerification = 'verified' | 'awaiting_verification';

export type OfferVerification =
  | 'verified'
  | 'eligibility_needs_confirmation'
  | 'expired'
  | 'awaiting_verification';

export interface Service {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  websiteUrl: string;
  /** Original logo URL from the sheet. Never loaded by visitors' browsers. */
  logoUrl: string | null;
  /** Same-origin cached logo path (relative to the site base), if the build fetched one. */
  logo: string | null;
  country: string;
  status: 'active' | 'inactive';
  lastUpdated: string | null;
  notes: string | null;
  /** Popularity within its category (1 = most popular); set with the `rank` column in SERVICES. */
  rank?: number | null;
}

export interface Plan {
  id: string;
  serviceId: string;
  name: string;
  /** Listed price in `currency`; null when no reliable price is known. */
  price: number | null;
  currency: string;
  billing: BillingCycle;
  planUrl: string | null;
  features: string[];
  lastVerified: string | null;
  priceSourceUrl: string | null;
  status: 'active' | 'inactive';
  verification: PlanVerification;
  /** Plans in the same group are the same product on different billing cycles. */
  group: string | null;
  /** individual, family, student, duo, mobile ... used for eligibility-aware suggestions. */
  planType: string | null;
  notes: string | null;
}

export interface Offer {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  originalPrice: number | null;
  offerPrice: number | null;
  currency: string;
  billing: BillingCycle | null;
  offerUrl: string | null;
  eligibility: string;
  validFrom: string | null;
  validUntil: string | null;
  sourceUrl: string | null;
  lastVerified: string | null;
  verification: OfferVerification;
}

export interface Bundle {
  id: string;
  provider: string;
  name: string;
  description: string;
  includedServiceIds: string[];
  /** Specific catalogue plans the bundle includes, used for like-for-like comparison. */
  includedPlanIds: string[];
  price: number | null;
  currency: string;
  billing: BillingCycle;
  eligibility: string;
  offerUrl: string | null;
  sourceUrl: string | null;
  lastVerified: string | null;
  status: 'active' | 'inactive';
  verification: PlanVerification;
  notes: string | null;
}

export interface Catalogue {
  generatedAt: string;
  version: number;
  services: Service[];
  plans: Plan[];
  offers: Offer[];
  bundles: Bundle[];
}

/* ---------- Personal data (stored in the visitor's browser) ---------- */

export type SubscriptionStatus = 'active' | 'considering' | 'cancelled';

export type PaymentMethod =
  | 'upi_autopay'
  | 'credit_card'
  | 'debit_card'
  | 'net_banking'
  | 'app_store'
  | 'google_play'
  | 'telecom_bill'
  | 'wallet'
  | 'other';

export interface CustomServiceInfo {
  name: string;
  category: CategoryId;
  websiteUrl?: string;
}

export interface UserSubscription {
  id: string;
  /** Catalogue service; null for a custom subscription. */
  serviceId: string | null;
  custom?: CustomServiceInfo;
  planId: string | null;
  /** What the user actually pays per billing cycle, in INR. Always takes priority. */
  amount: number;
  currency: 'INR';
  billing: BillingCycle;
  /** ISO date (YYYY-MM-DD) of the next renewal the user entered. */
  nextRenewal?: string;
  paymentMethod?: PaymentMethod;
  /** Short label like "HDFC card" — never card numbers. */
  paymentLabel?: string;
  notes?: string;
  status: SubscriptionStatus;
  /** Days before renewal to remind; 0 = on the day. */
  reminderOffsets?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonalData {
  app: 'unsubscribe';
  schemaVersion: 1;
  updatedAt: string;
  subscriptions: UserSubscription[];
}
