#!/usr/bin/env node
// Downloads the four tabs of the master Google Sheet (published as CSV) into
// catalogue/csv/. The new files are only written if the whole catalogue
// validates, so a half-edited sheet can never replace a working catalogue.
//
// Set these environment variables (GitHub: Settings → Secrets and variables → Actions → Variables):
//   SHEET_SERVICES_CSV_URL, SHEET_PLANS_CSV_URL, SHEET_OFFERS_CSV_URL, SHEET_BUNDLES_CSV_URL
// Each is the "Publish to web → CSV" link of one tab. See docs/catalogue.md.
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { buildCatalogue } from './lib/catalogue-core.mjs';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const tabs = {
  services: process.env.SHEET_SERVICES_CSV_URL,
  plans: process.env.SHEET_PLANS_CSV_URL,
  offers: process.env.SHEET_OFFERS_CSV_URL,
  bundles: process.env.SHEET_BUNDLES_CSV_URL,
};

const missing = Object.entries(tabs).filter(([, v]) => !v).map(([k]) => `SHEET_${k.toUpperCase()}_CSV_URL`);
if (missing.length) {
  console.error(`✗ Missing ${missing.join(', ')}. See docs/catalogue.md → "Connect the Google Sheet".`);
  process.exit(1);
}

const csv = {};
for (const [name, url] of Object.entries(tabs)) {
  const u = new URL(url);
  if (u.hostname !== 'docs.google.com') {
    console.error(`✗ ${name}: expected a docs.google.com published CSV link, got ${u.hostname}`);
    process.exit(1);
  }
  const res = await fetch(url, { redirect: 'follow' });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    console.error(`✗ ${name}: HTTP ${res.status}. Is the tab published to the web as CSV?`);
    process.exit(1);
  }
  const text = await res.text();
  if (type.includes('text/html') || /^\s*<!doctype html/i.test(text)) {
    console.error(`✗ ${name}: got a web page instead of CSV. Publish the tab as "Comma-separated values (.csv)".`);
    process.exit(1);
  }
  csv[name] = text.replace(/\r\n/g, '\n');
  console.log(`· ${name}: ${text.split('\n').length - 1} rows downloaded`);
}

const { errors, warnings } = buildCatalogue(csv);
for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\nThe sheet has ${errors.length} error(s). Nothing was changed. Fix the sheet and run the sync again.`);
  process.exit(1);
}
for (const [name, text] of Object.entries(csv)) {
  await writeFile(join(root, 'catalogue/csv', `${name}.csv`), text.endsWith('\n') ? text : text + '\n');
}
console.log('✓ Sheet downloaded and validated → catalogue/csv/');
