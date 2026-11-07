#!/usr/bin/env node
// Builds public/data/catalogue.json from catalogue/csv/*.csv.
// Fails (exit 1) on any validation error so a broken sheet can never be deployed.
//
//   node scripts/build-catalogue.mjs [--csv-dir catalogue/csv] [--out public/data/catalogue.json]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildCatalogue } from './lib/catalogue-core.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const csvDir = resolve(root, arg('--csv-dir', 'catalogue/csv'));
const out = resolve(root, arg('--out', 'public/data/catalogue.json'));
const logoManifest = resolve(root, 'public/logos/manifest.json');

const csv = {};
for (const name of ['services', 'plans', 'offers', 'bundles']) {
  const file = join(csvDir, `${name}.csv`);
  if (!existsSync(file)) {
    console.error(`✗ Missing ${file}`);
    process.exit(1);
  }
  csv[name] = await readFile(file, 'utf8');
}

const logos = existsSync(logoManifest) ? JSON.parse(await readFile(logoManifest, 'utf8')) : {};

// Keep generatedAt stable when nothing changed, so rebuilding doesn't create noisy commits.
let previous = null;
if (existsSync(out)) {
  try { previous = JSON.parse(await readFile(out, 'utf8')); } catch { previous = null; }
}

const { catalogue, errors, warnings } = buildCatalogue(csv, { logos });
for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\nCatalogue has ${errors.length} error(s). Fix them in the sheet or CSV and run again.`);
  process.exit(1);
}

if (previous) {
  const strip = (c) => JSON.stringify({ ...c, generatedAt: '' });
  if (strip(previous) === strip(catalogue)) catalogue.generatedAt = previous.generatedAt;
}

await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(catalogue, null, 2) + '\n');
const verified = catalogue.plans.filter((p) => p.verification === 'verified').length;
const priced = catalogue.plans.filter((p) => p.price !== null).length;
console.log(
  `✓ Catalogue: ${catalogue.services.length} services, ${catalogue.plans.length} plans (${priced} priced, ${verified} verified), ` +
    `${catalogue.offers.length} offers, ${catalogue.bundles.length} bundles, ${Object.keys(logos).length} cached logos → ${out.replace(root + '/', '')}`,
);
