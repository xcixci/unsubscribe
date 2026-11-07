import type { CategoryId } from './types';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  /** Short label for tight spaces such as chart legends. */
  short: string;
}

/** In the order Explore shows them: what most people in India pay for comes first. */
export const CATEGORIES: CategoryInfo[] = [
  { id: 'ott', label: 'OTT & video streaming', short: 'Video' },
  { id: 'music', label: 'Music & audio', short: 'Music & audio' },
  { id: 'shopping', label: 'Shopping memberships', short: 'Shopping' },
  { id: 'food', label: 'Food, grocery & lifestyle', short: 'Food & grocery' },
  { id: 'ai', label: 'AI tools & assistants', short: 'AI' },
  { id: 'education', label: 'Education & learning', short: 'Learning' },
  { id: 'fitness', label: 'Health, fitness & wellness', short: 'Health & fitness' },
  { id: 'news', label: 'News & reading', short: 'Reading' },
  { id: 'cloud', label: 'Cloud storage', short: 'Cloud' },
  { id: 'productivity', label: 'Productivity & office', short: 'Productivity' },
  { id: 'design', label: 'Design & creative', short: 'Design' },
  { id: 'gaming', label: 'Gaming', short: 'Gaming' },
  { id: 'developer', label: 'Developer tools & hosting', short: 'Developer' },
  { id: 'travel', label: 'Travel & transport', short: 'Travel' },
  { id: 'finance', label: 'Finance & investing', short: 'Finance' },
  { id: 'social', label: 'Dating & social', short: 'Social' },
  { id: 'security', label: 'Security, VPN & utilities', short: 'Utilities' },
  { id: 'other', label: 'Other digital services', short: 'Other' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryLabel(id: string): string {
  return byId.get(id as CategoryId)?.label ?? 'Other digital services';
}

export function categoryShort(id: string): string {
  return byId.get(id as CategoryId)?.short ?? 'Other';
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && byId.has(value as CategoryId);
}
