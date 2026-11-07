import type { Bundle, Offer, Plan, Service, UserSubscription } from '../src/domain/types';
import { indexCatalogue } from '../src/domain/spending';

export function service(id: string, category: Service['category'] = 'ott'): Service {
  return { id, name: id.toUpperCase(), category, description: '', websiteUrl: 'https://example.com', logoUrl: null, logo: null, country: 'IN', status: 'active', lastUpdated: null, notes: null };
}

export function plan(id: string, serviceId: string, price: number | null, billing: Plan['billing'], extra: Partial<Plan> = {}): Plan {
  return {
    id, serviceId, name: id, price, currency: 'INR', billing, planUrl: null, features: [], lastVerified: null,
    priceSourceUrl: null, status: 'active', verification: 'awaiting_verification', group: id, planType: null, notes: null, ...extra,
  };
}

export function sub(id: string, serviceId: string | null, amount: number, billing: UserSubscription['billing'], extra: Partial<UserSubscription> = {}): UserSubscription {
  return { id, serviceId, planId: null, amount, currency: 'INR', billing, status: 'active', createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-01T00:00:00Z', ...extra };
}

export function offer(id: string, serviceId: string, extra: Partial<Offer> = {}): Offer {
  return {
    id, serviceId, title: id, description: '', originalPrice: null, offerPrice: null, currency: 'INR', billing: null, offerUrl: null,
    eligibility: '', validFrom: null, validUntil: null, sourceUrl: 'https://example.com', lastVerified: null, verification: 'verified', ...extra,
  };
}

export function bundle(id: string, serviceIds: string[], extra: Partial<Bundle> = {}): Bundle {
  return {
    id, provider: 'Telco', name: id, description: '', includedServiceIds: serviceIds, includedPlanIds: [], price: 749, currency: 'INR',
    billing: { frequency: 'monthly' }, eligibility: '', offerUrl: null, sourceUrl: 'https://example.com', lastVerified: null, status: 'active',
    verification: 'awaiting_verification', notes: null, ...extra,
  };
}

export const services = [service('netflix', 'ott'), service('spotify', 'music'), service('chatgpt', 'ai'), service('hotstar', 'ott')];
export const plans = [
  plan('netflix-premium', 'netflix', 649, { frequency: 'monthly' }),
  plan('netflix-basic', 'netflix', 199, { frequency: 'monthly' }),
  plan('spotify-standard', 'spotify', 139, { frequency: 'monthly' }, { planType: 'individual' }),
  plan('spotify-student', 'spotify', 69, { frequency: 'monthly' }, { planType: 'student' }),
  plan('spotify-platinum', 'spotify', 299, { frequency: 'monthly' }, { planType: 'family' }),
  plan('hotstar-super-monthly', 'hotstar', 149, { frequency: 'monthly' }, { group: 'hotstar-super' }),
  plan('hotstar-super-annual', 'hotstar', 1099, { frequency: 'annual' }, { group: 'hotstar-super', verification: 'verified' }),
  plan('hotstar-premium-monthly', 'hotstar', 299, { frequency: 'monthly' }, { group: 'hotstar-premium' }),
  plan('hotstar-mobile-annual', 'hotstar', 499, { frequency: 'annual' }, { group: 'hotstar-mobile' }),
];
export const idx = indexCatalogue({ services, plans });
