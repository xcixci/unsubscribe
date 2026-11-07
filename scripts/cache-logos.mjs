#!/usr/bin/env node
// Downloads each service's logo_url once, at build time, into public/logos/.
// Visitors' browsers then load logos from our own domain only — no requests to
// third parties, so no one else learns who is browsing UNSUBSCRIBE.
// Any failure is non-fatal: the website falls back to the service's initials.
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseCsv, isHttpUrl } from './lib/catalogue-core.mjs';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const outDir = join(root, 'public/logos');
const MAX_BYTES = 300_000;
const TIMEOUT_MS = 10_000;
const TYPES = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/gif': 'gif',
};

const { rows } = parseCsv(await readFile(join(root, 'catalogue/csv/services.csv'), 'utf8'));
await mkdir(outDir, { recursive: true });
for (const f of await readdir(outDir)) if (f !== '.gitkeep') await unlink(join(outDir, f));

async function fetchLogo(id, url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'unsubscribe-catalogue-build' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const ext = TYPES[type];
    if (!ext) throw new Error(`not an image (${type || 'no content-type'})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) throw new Error('image is empty');
    if (buf.length > MAX_BYTES) throw new Error(`image too large (${buf.length} bytes)`);
    if (ext === 'svg' && /<script|on\w+=/i.test(buf.toString('utf8'))) throw new Error('SVG contains scripts');
    const file = `${id}.${ext}`;
    await writeFile(join(outDir, file), buf);
    return `logos/${file}`;
  } finally {
    clearTimeout(timer);
  }
}

const manifest = {};
const queue = rows.filter((r) => r.service_id && r.logo_url && isHttpUrl(r.logo_url.trim()));
let ok = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const r = queue.shift();
      const id = r.service_id.trim();
      try {
        manifest[id] = await fetchLogo(id, r.logo_url.trim());
        ok += 1;
      } catch (e) {
        console.warn(`! ${id}: logo not cached (${e.message}); initials will be shown`);
      }
    }
  }),
);
await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ Cached ${ok} of ${rows.length} logos in public/logos/`);
