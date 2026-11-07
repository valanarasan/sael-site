import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { blogSchema } from './lib/schemas/blog';
import { chatSchema } from './lib/schemas/chat';
import { faqSchema } from './lib/schemas/faqs';
import { projectSchema } from './lib/schemas/projects';
import { sectionsSchema } from './lib/schemas/sections';
import { settingsSchema } from './lib/schemas/settings';
import { subsidySchema } from './lib/schemas/subsidy';

/**
 * Content collections. Every file SAEL edits through Pages CMS is validated here at build time,
 * so a bad edit fails the build instead of reaching the live site.
 * Schemas live in src/lib/schemas so unit tests can check fixtures against them.
 */

/** Wraps a single-object JSON file (like settings.json) as a one-entry collection. */
const singleton = (path: string, id: string) =>
  file(path, { parser: (text) => [{ id, ...(JSON.parse(text) as Record<string, unknown>) }] });

/** Gives each item in a JSON list an id from its position, so editors don't manage ids. */
const list = (path: string) =>
  file(path, {
    parser: (text) =>
      (JSON.parse(text) as Record<string, unknown>[]).map((item, i) => ({
        id: String(i + 1).padStart(2, '0'),
        ...item,
      })),
  });

const blogRef = () => reference('blog');

export const collections = {
  settings: defineCollection({
    loader: singleton('src/content/settings.json', 'settings'),
    schema: settingsSchema,
  }),
  sections: defineCollection({
    loader: singleton('src/content/sections.json', 'sections'),
    schema: ({ image }) => sectionsSchema(image),
  }),
  subsidy: defineCollection({
    loader: singleton('src/content/subsidy.json', 'subsidy'),
    schema: subsidySchema,
  }),
  chat: defineCollection({
    loader: singleton('src/content/chat.json', 'chat'),
    schema: chatSchema(blogRef),
  }),
  faqs: defineCollection({
    loader: list('src/content/faqs.json'),
    schema: faqSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '*.json', base: 'src/content/projects' }),
    schema: ({ image }) => projectSchema(image),
  }),
  blog: defineCollection({
    loader: glob({ pattern: '**/*.md', base: 'src/content/blog' }),
    schema: ({ image }) => blogSchema(image),
  }),
};
