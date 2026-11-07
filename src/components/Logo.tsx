import { useState } from 'react';
import { assetUrl } from '../data/catalogue';

export function initials(name: string): string {
  const clean = name.replace(/\(.*?\)/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0] ?? '?';
  const camel = w.slice(1).match(/\p{Lu}/u);
  return (w[0] + (camel ? camel[0] : '')).toUpperCase();
}

/**
 * Service logo, loaded only from our own domain (cached at build time).
 * Falls back to initials when there is no cached logo or it fails to load.
 */
export function Logo({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const cls = `logo${size === 'md' ? '' : ` logo--${size}`}`;
  if (!src || failed) {
    return (
      <span className={`${cls} logo--initials`} aria-hidden="true">
        {initials(name)}
      </span>
    );
  }
  return (
    <span className={cls} aria-hidden="true">
      <img src={assetUrl(src)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </span>
  );
}
