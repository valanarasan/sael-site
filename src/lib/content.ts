/**
 * Content repository. Pages read content only through these functions, never from
 * astro:content directly, so a later move to another CMS changes this file alone.
 * Step 3 adds getProjects(), getFaqs(), getPosts() and the rest.
 */
import { getEntry } from 'astro:content';
import type { Settings } from './schemas/settings';

export async function getSettings(): Promise<Settings> {
  const entry = await getEntry('settings', 'settings');
  if (!entry) throw new Error('src/content/settings.json is missing');
  return entry.data;
}
