import type { Catalogue } from '../domain/types';

/** Resolve a path inside the deployed site (handles the /unsubscribe/ base on GitHub Pages). */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

export class CatalogueError extends Error {}

function isCatalogue(v: unknown): v is Catalogue {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return Array.isArray(c.services) && Array.isArray(c.plans) && Array.isArray(c.offers) && Array.isArray(c.bundles);
}

export async function loadCatalogue(signal?: AbortSignal): Promise<Catalogue> {
  let res: Response;
  try {
    res = await fetch(assetUrl('data/catalogue.json'), { signal, cache: 'no-cache' });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new CatalogueError('Could not reach the catalogue. Check your connection and try again.');
  }
  if (!res.ok) throw new CatalogueError(`The catalogue could not be loaded (error ${res.status}). Try again in a moment.`);
  const data: unknown = await res.json().catch(() => null);
  if (!isCatalogue(data)) throw new CatalogueError('The catalogue file is damaged. Try again later.');
  return {
    ...data,
    services: data.services.filter((s) => s && s.id && s.name),
    plans: data.plans.filter((p) => p && p.id && p.serviceId),
  };
}
