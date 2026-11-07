import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { settingsSchema } from './lib/schemas/settings';

/**
 * Content collections. Every file SAEL edits through Pages CMS is validated here at build time,
 * so a bad edit fails the build instead of reaching the live site.
 * Schemas live in src/lib/schemas so unit tests can check fixtures against them.
 * Step 3 adds sections, projects, faqs, subsidy, chat and blog.
 */

/** Wraps a single-object JSON file (like settings.json) as a one-entry collection. */
const singleton = (path: string, id: string) =>
  file(path, { parser: (text) => [{ id, ...(JSON.parse(text) as Record<string, unknown>) }] });

const settings = defineCollection({
  loader: singleton('src/content/settings.json', 'settings'),
  schema: settingsSchema,
});

export const collections = { settings };
