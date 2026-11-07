import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error — plain ESM module without type declarations
import { buildCatalogue } from '../scripts/lib/catalogue-core.mjs';

const dir = join(__dirname, '..', 'catalogue');
const read = (sub: string, name: string) => readFileSync(join(dir, sub, `${name}.csv`), 'utf8');
const real = () => ({ services: read('csv', 'services'), plans: read('csv', 'plans'), offers: read('csv', 'offers'), bundles: read('csv', 'bundles') });

describe('catalogue build', () => {
  it('builds the shipped catalogue with no errors', () => {
    const { catalogue, errors } = buildCatalogue(real(), { today: '2026-11-07' });
    expect(errors).toEqual([]);
    expect(catalogue.services.length).toBeGreaterThanOrEqual(25);
    expect(catalogue.plans.length).toBeGreaterThan(50);
  });

  it('covers every category from the brief', () => {
    const { catalogue } = buildCatalogue(real(), { today: '2026-11-07' });
    const cats = new Set(catalogue.services.map((s: { category: string }) => s.category));
    for (const c of ['ott', 'music', 'ai', 'productivity', 'design', 'cloud', 'gaming', 'education', 'news', 'fitness', 'shopping', 'food', 'security', 'other']) {
      expect(cats.has(c)).toBe(true);
    }
  });

  it('never marks a plan verified without a price, a source and a date', () => {
    const { catalogue } = buildCatalogue(real(), { today: '2026-11-07' });
    for (const p of catalogue.plans) {
      if (p.verification === 'verified') {
        expect(p.price).not.toBeNull();
        expect(p.priceSourceUrl).toBeTruthy();
        expect(p.lastVerified).toBeTruthy();
      }
      if (p.price !== null) expect(p.priceSourceUrl).toBeTruthy();
    }
  });

  it('builds from the blank templates', () => {
    const t = { services: read('templates', 'services'), plans: read('templates', 'plans'), offers: read('templates', 'offers'), bundles: read('templates', 'bundles') };
    const { errors, catalogue } = buildCatalogue(t, { today: '2026-11-07' });
    expect(errors).toEqual([]);
    expect(catalogue.services).toEqual([]);
  });

  it('rejects broken references, bad prices and duplicate ids', () => {
    const csv = real();
    csv.plans += 'bad-plan,does-not-exist,X,abc,INR,monthly,1,,,,,,active,,,,\n';
    csv.plans += 'netflix-mobile,netflix,Duplicate,1,INR,monthly,1,,,,,https://example.com,active,,,,\n';
    const { errors } = buildCatalogue(csv, { today: '2026-11-07' });
    expect(errors.some((e: string) => e.includes('does not exist'))).toBe(true);
    expect(errors.some((e: string) => e.includes('not a valid non-negative number'))).toBe(true);
    expect(errors.some((e: string) => e.includes('duplicate plan_id'))).toBe(true);
  });

  it('rejects missing columns, wrong frequencies and future verification dates', () => {
    const csv = real();
    csv.services = csv.services.replace('logo_url,', 'logo,');
    csv.plans += 'x-1,netflix,X,10,INR,fortnightly,1,,,,,https://example.com,active,,,,\n';
    csv.plans += 'x-2,netflix,X,10,INR,monthly,1,,,,2030-01-01,https://example.com,active,verified,,,\n';
    const { errors } = buildCatalogue(csv, { today: '2026-11-07' });
    expect(errors.some((e: string) => e.includes('missing required column "logo_url"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('billing_frequency "fortnightly"'))).toBe(true);
    expect(errors.some((e: string) => e.includes('in the future'))).toBe(true);
  });

  it('refuses to use a website URL as a logo', () => {
    const csv = real();
    csv.services += 'test-svc,Test,other,Desc,https://example.com/,https://example.com/,IN,active,2026-11-07,\n';
    const { catalogue, warnings } = buildCatalogue(csv, { today: '2026-11-07' });
    expect(catalogue.services.find((s: { id: string }) => s.id === 'test-svc').logoUrl).toBeNull();
    expect(warnings.some((w: string) => w.includes('not an image'))).toBe(true);
  });

  it('drops columns that are not meant to be published', () => {
    const csv = real();
    csv.services = csv.services.replace('notes\n', 'notes,private_contact\n');
    const { catalogue, warnings } = buildCatalogue(csv, { today: '2026-11-07' });
    expect(JSON.stringify(catalogue)).not.toContain('private_contact');
    expect(warnings.some((w: string) => w.includes('private_contact'))).toBe(true);
  });

  it('supports day-based telecom cycles', () => {
    const { catalogue } = buildCatalogue(real(), { today: '2026-11-07' });
    const jio = catalogue.bundles.find((b: { id: string }) => b.id === 'jio-prepaid-1299');
    expect(jio.billing).toEqual({ frequency: 'custom', interval: { unit: 'days', count: 84 } });
  });
});
