// Pure functions that turn the four catalogue CSVs into validated, publishable JSON.
// Used by scripts/build-catalogue.mjs and by the test suite.
import Papa from 'papaparse';

export const CATALOGUE_VERSION = 1;

export const CATEGORIES = [
  'ott', 'music', 'ai', 'productivity', 'design', 'developer', 'cloud', 'gaming',
  'education', 'news', 'fitness', 'shopping', 'food', 'travel', 'finance', 'social',
  'security', 'other',
];

export const COLUMNS = {
  services: {
    required: ['service_id', 'service_name', 'category', 'description', 'website_url', 'logo_url', 'country', 'status', 'last_updated'],
    optional: ['notes', 'featured'],
  },
  plans: {
    required: ['plan_id', 'service_id', 'plan_name', 'price', 'currency', 'billing_frequency', 'billing_period_months', 'plan_url', 'features', 'last_verified', 'price_source_url', 'status'],
    optional: ['billing_period_days', 'verification_status', 'plan_group', 'plan_type', 'notes'],
  },
  offers: {
    required: ['offer_id', 'service_id', 'offer_title', 'offer_description', 'original_price', 'offer_price', 'currency', 'offer_url', 'eligibility', 'valid_from', 'valid_until', 'source_url', 'last_verified', 'verification_status'],
    optional: ['billing_frequency', 'billing_period_months', 'billing_period_days'],
  },
  bundles: {
    required: ['bundle_id', 'provider', 'bundle_name', 'description', 'included_service_ids', 'price', 'currency', 'billing_frequency', 'eligibility', 'offer_url', 'source_url', 'last_verified', 'status'],
    optional: ['included_plan_ids', 'billing_period_months', 'billing_period_days', 'verification_status', 'notes'],
  },
};

const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIXED_MONTHS = { monthly: 1, quarterly: 3, half_yearly: 6, annual: 12 };
const FREQ_ALIASES = {
  monthly: 'monthly', month: 'monthly', quarterly: 'quarterly', half_yearly: 'half_yearly', halfyearly: 'half_yearly',
  semi_annual: 'half_yearly', annual: 'annual', yearly: 'annual', custom: 'custom',
};
const PLAN_VERIFICATION = ['verified', 'awaiting_verification'];
const OFFER_VERIFICATION = ['verified', 'eligibility_needs_confirmation', 'expired', 'awaiting_verification'];
const STATUS = ['active', 'inactive'];

export function parseCsv(text) {
  const result = Papa.parse(text.replace(/^﻿/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim().toLowerCase() });
  return { rows: result.data, fields: result.meta.fields ?? [], errors: result.errors };
}

class Report {
  constructor() { this.errors = []; this.warnings = []; }
  error(where, msg) { this.errors.push(`${where}: ${msg}`); }
  warn(where, msg) { this.warnings.push(`${where}: ${msg}`); }
}

const s = (v) => (v === undefined || v === null ? '' : String(v).trim());
const orNull = (v) => (s(v) === '' ? null : s(v));

/** `featured` column: "yes" puts a service in the first page of Explore. Blank or "no" = not featured. */
function featuredFlag(where, raw, report) {
  const v = (raw ?? '').toString().trim().toLowerCase();
  if (v === '' || v === 'no' || v === 'false') return false;
  if (v === 'yes' || v === 'true') return true;
  report.error(where, `featured "${raw}" must be yes or blank`);
  return false;
}

export function isValidDate(v) {
  if (!DATE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isHttpUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function num(where, field, raw, report, { required = false } = {}) {
  const t = s(raw).replace(/[₹,\s]/g, '');
  if (t === '') {
    if (required) report.error(where, `${field} is required`);
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    report.error(where, `${field} "${raw}" is not a valid non-negative number`);
    return null;
  }
  return Math.round(n * 100) / 100;
}

function url(where, field, raw, report, { required = false } = {}) {
  const v = s(raw);
  if (!v) {
    if (required) report.error(where, `${field} is required`);
    return null;
  }
  if (!isHttpUrl(v)) {
    report.error(where, `${field} "${v}" is not a valid http(s) URL`);
    return null;
  }
  return v;
}

function date(where, field, raw, report, today) {
  const v = s(raw);
  if (!v) return null;
  if (!isValidDate(v)) {
    report.error(where, `${field} "${v}" must be a date in YYYY-MM-DD format`);
    return null;
  }
  if (field === 'last_verified' && today && v > today) report.error(where, `${field} ${v} is in the future`);
  return v;
}

function cycle(where, row, report, { required = true } = {}) {
  const raw = s(row.billing_frequency).toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw) {
    if (required) report.error(where, 'billing_frequency is required');
    return null;
  }
  const f = FREQ_ALIASES[raw];
  if (!f) {
    report.error(where, `billing_frequency "${row.billing_frequency}" must be monthly, quarterly, half_yearly, annual or custom`);
    return null;
  }
  const months = s(row.billing_period_months) ? Number(s(row.billing_period_months)) : null;
  const days = s(row.billing_period_days) ? Number(s(row.billing_period_days)) : null;
  if (f !== 'custom') {
    if (months !== null && months !== FIXED_MONTHS[f]) {
      report.error(where, `billing_period_months is ${months} but ${f} means ${FIXED_MONTHS[f]}`);
    }
    return { frequency: f };
  }
  if (days !== null && Number.isInteger(days) && days > 0) return { frequency: 'custom', interval: { unit: 'days', count: days } };
  if (months !== null && Number.isInteger(months) && months > 0) return { frequency: 'custom', interval: { unit: 'months', count: months } };
  report.error(where, 'custom billing needs a whole billing_period_days or billing_period_months');
  return null;
}

function checkColumns(name, fields, report) {
  const missing = COLUMNS[name].required.filter((c) => !fields.includes(c));
  for (const c of missing) report.error(`${name}.csv`, `missing required column "${c}"`);
  const known = new Set([...COLUMNS[name].required, ...COLUMNS[name].optional]);
  const extra = fields.filter((f) => f && !known.has(f));
  if (extra.length) report.warn(`${name}.csv`, `ignoring columns not published to the website: ${extra.join(', ')}`);
  return missing.length === 0;
}

function uniqueIds(name, rows, key, report) {
  const seen = new Set();
  rows.forEach((r, i) => {
    const id = s(r[key]);
    const where = `${name}.csv row ${i + 2}`;
    if (!id) report.error(where, `${key} is required`);
    else if (!ID.test(id)) report.error(where, `${key} "${id}" must be lowercase letters, numbers and hyphens`);
    else if (seen.has(id)) report.error(where, `duplicate ${key} "${id}"`);
    seen.add(id);
  });
}

/**
 * @param {{services: string, plans: string, offers: string, bundles: string}} csv raw CSV text per tab
 * @param {{today?: string, logos?: Record<string, string>, generatedAt?: string}} options
 */
export function buildCatalogue(csv, options = {}) {
  const report = new Report();
  // Prices are checked from India, so "today" is the date in India (UTC+5:30), not UTC.
  const today = options.today ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const logos = options.logos ?? {};
  const parsed = {};
  for (const name of ['services', 'plans', 'offers', 'bundles']) {
    const p = parseCsv(csv[name] ?? '');
    for (const e of p.errors) report.error(`${name}.csv row ${(e.row ?? 0) + 2}`, `CSV problem: ${e.message}`);
    parsed[name] = checkColumns(name, p.fields, report) ? p.rows : [];
  }

  uniqueIds('services', parsed.services, 'service_id', report);
  uniqueIds('plans', parsed.plans, 'plan_id', report);
  uniqueIds('offers', parsed.offers, 'offer_id', report);
  uniqueIds('bundles', parsed.bundles, 'bundle_id', report);

  const services = parsed.services.map((r, i) => {
    const where = `services.csv row ${i + 2} (${s(r.service_id)})`;
    const category = s(r.category).toLowerCase();
    if (!CATEGORIES.includes(category)) report.error(where, `category "${r.category}" must be one of: ${CATEGORIES.join(', ')}`);
    const status = s(r.status).toLowerCase() || 'active';
    if (!STATUS.includes(status)) report.error(where, `status must be active or inactive`);
    if (!s(r.service_name)) report.error(where, 'service_name is required');
    const website = url(where, 'website_url', r.website_url, report, { required: true });
    let logoUrl = url(where, 'logo_url', r.logo_url, report);
    if (logoUrl && website && logoUrl.replace(/\/$/, '') === website.replace(/\/$/, '')) {
      report.warn(where, 'logo_url is the same as website_url — a website address is not an image. Using initials instead.');
      logoUrl = null;
    }
    if (!logoUrl) report.warn(where, 'no logo_url; the website will show initials');
    return {
      id: s(r.service_id),
      name: s(r.service_name),
      category: CATEGORIES.includes(category) ? category : 'other',
      description: s(r.description),
      websiteUrl: website ?? '',
      logoUrl,
      logo: logos[s(r.service_id)] ?? null,
      country: s(r.country) || 'IN',
      status: STATUS.includes(status) ? status : 'active',
      lastUpdated: date(where, 'last_updated', r.last_updated, report, today),
      notes: orNull(r.notes),
      featured: featuredFlag(where, r.featured, report),
    };
  });
  const serviceIds = new Set(services.map((x) => x.id));

  const plans = parsed.plans.map((r, i) => {
    const where = `plans.csv row ${i + 2} (${s(r.plan_id)})`;
    if (!serviceIds.has(s(r.service_id))) report.error(where, `service_id "${s(r.service_id)}" does not exist in services.csv`);
    if (!s(r.plan_name)) report.error(where, 'plan_name is required');
    const price = num(where, 'price', r.price, report);
    const currency = s(r.currency).toUpperCase() || 'INR';
    if (currency !== 'INR') report.error(where, `currency "${currency}" — this release only supports INR. Leave price blank and explain in notes if a service bills in another currency.`);
    const verification = s(r.verification_status).toLowerCase() || 'awaiting_verification';
    if (!PLAN_VERIFICATION.includes(verification)) report.error(where, `verification_status must be ${PLAN_VERIFICATION.join(' or ')}`);
    const lastVerified = date(where, 'last_verified', r.last_verified, report, today);
    const source = url(where, 'price_source_url', r.price_source_url, report);
    if (price !== null && !source) report.error(where, 'a price needs a price_source_url');
    if (verification === 'verified') {
      if (price === null) report.error(where, 'a verified plan needs a price');
      if (!lastVerified) report.error(where, 'a verified plan needs last_verified');
    }
    const status = s(r.status).toLowerCase() || 'active';
    if (!STATUS.includes(status)) report.error(where, 'status must be active or inactive');
    return {
      id: s(r.plan_id),
      serviceId: s(r.service_id),
      name: s(r.plan_name),
      price,
      currency,
      billing: cycle(where, r, report) ?? { frequency: 'monthly' },
      planUrl: url(where, 'plan_url', r.plan_url, report),
      features: s(r.features).split('|').map((f) => f.trim()).filter(Boolean),
      lastVerified,
      priceSourceUrl: source,
      status: STATUS.includes(status) ? status : 'active',
      verification: PLAN_VERIFICATION.includes(verification) ? verification : 'awaiting_verification',
      group: orNull(r.plan_group),
      planType: orNull(r.plan_type)?.toLowerCase() ?? null,
      notes: orNull(r.notes),
    };
  });
  const planById = new Map(plans.map((p) => [p.id, p]));

  const offers = parsed.offers.map((r, i) => {
    const where = `offers.csv row ${i + 2} (${s(r.offer_id)})`;
    if (!serviceIds.has(s(r.service_id))) report.error(where, `service_id "${s(r.service_id)}" does not exist in services.csv`);
    if (!s(r.offer_title)) report.error(where, 'offer_title is required');
    const original = num(where, 'original_price', r.original_price, report);
    const offerPrice = num(where, 'offer_price', r.offer_price, report);
    if (original !== null && offerPrice !== null && offerPrice > original) report.warn(where, 'offer_price is higher than original_price');
    const verification = s(r.verification_status).toLowerCase() || 'awaiting_verification';
    if (!OFFER_VERIFICATION.includes(verification)) report.error(where, `verification_status must be one of ${OFFER_VERIFICATION.join(', ')}`);
    const lastVerified = date(where, 'last_verified', r.last_verified, report, today);
    if (verification === 'verified' && !lastVerified) report.error(where, 'a verified offer needs last_verified');
    const source = url(where, 'source_url', r.source_url, report);
    if (!source) report.error(where, 'every offer needs a source_url');
    const validFrom = date(where, 'valid_from', r.valid_from, report, today);
    const validUntil = date(where, 'valid_until', r.valid_until, report, today);
    if (validFrom && validUntil && validUntil < validFrom) report.error(where, 'valid_until is before valid_from');
    const currency = s(r.currency).toUpperCase() || 'INR';
    if (currency !== 'INR') report.error(where, `currency "${currency}" is not supported in this release`);
    return {
      id: s(r.offer_id),
      serviceId: s(r.service_id),
      title: s(r.offer_title),
      description: s(r.offer_description),
      originalPrice: original,
      offerPrice,
      currency,
      billing: s(r.billing_frequency) ? cycle(where, r, report, { required: false }) : null,
      offerUrl: url(where, 'offer_url', r.offer_url, report),
      eligibility: s(r.eligibility),
      validFrom,
      validUntil,
      sourceUrl: source,
      lastVerified,
      verification: OFFER_VERIFICATION.includes(verification) ? verification : 'awaiting_verification',
    };
  });

  const bundles = parsed.bundles.map((r, i) => {
    const where = `bundles.csv row ${i + 2} (${s(r.bundle_id)})`;
    const included = s(r.included_service_ids).split('|').map((x) => x.trim()).filter(Boolean);
    if (!included.length) report.error(where, 'included_service_ids needs at least one service');
    for (const id of included) if (!serviceIds.has(id)) report.error(where, `included service "${id}" does not exist in services.csv`);
    const planIds = s(r.included_plan_ids).split('|').map((x) => x.trim()).filter(Boolean);
    for (const id of planIds) {
      const p = planById.get(id);
      if (!p) report.error(where, `included plan "${id}" does not exist in plans.csv`);
      else if (!included.includes(p.serviceId)) report.error(where, `included plan "${id}" belongs to ${p.serviceId}, which is not in included_service_ids`);
    }
    const verification = s(r.verification_status).toLowerCase() || 'awaiting_verification';
    if (!PLAN_VERIFICATION.includes(verification)) report.error(where, `verification_status must be ${PLAN_VERIFICATION.join(' or ')}`);
    const lastVerified = date(where, 'last_verified', r.last_verified, report, today);
    if (verification === 'verified' && !lastVerified) report.error(where, 'a verified bundle needs last_verified');
    const source = url(where, 'source_url', r.source_url, report);
    if (!source) report.error(where, 'every bundle needs a source_url');
    const status = s(r.status).toLowerCase() || 'active';
    if (!STATUS.includes(status)) report.error(where, 'status must be active or inactive');
    const currency = s(r.currency).toUpperCase() || 'INR';
    if (currency !== 'INR') report.error(where, `currency "${currency}" is not supported in this release`);
    if (!s(r.provider)) report.error(where, 'provider is required');
    return {
      id: s(r.bundle_id),
      provider: s(r.provider),
      name: s(r.bundle_name),
      description: s(r.description),
      includedServiceIds: included,
      includedPlanIds: planIds,
      price: num(where, 'price', r.price, report),
      currency,
      billing: cycle(where, r, report) ?? { frequency: 'monthly' },
      eligibility: s(r.eligibility),
      offerUrl: url(where, 'offer_url', r.offer_url, report),
      sourceUrl: source,
      lastVerified,
      status: STATUS.includes(status) ? status : 'active',
      verification: PLAN_VERIFICATION.includes(verification) ? verification : 'awaiting_verification',
      notes: orNull(r.notes),
    };
  });

  for (const svc of services) {
    if (!plans.some((p) => p.serviceId === svc.id)) report.warn(`services.csv (${svc.id})`, 'has no plans; visitors can still add it with their own amount');
  }

  const catalogue = {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    version: CATALOGUE_VERSION,
    services: services.sort((a, b) => a.name.localeCompare(b.name)),
    plans,
    offers,
    bundles,
  };
  return { catalogue, errors: report.errors, warnings: report.warnings };
}
