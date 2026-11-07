/**
 * Content repository. Pages read content only through these functions, never from
 * astro:content directly, so a later move to another CMS changes this file alone.
 */
import { getCollection, getEntry, render, type CollectionEntry } from 'astro:content';
import type { ChatContent } from './schemas/chat';
import type { Faq } from './schemas/faqs';
import type { Sections } from './schemas/sections';
import type { Settings } from './schemas/settings';
import type { SubsidyRules } from './schemas/subsidy';
import { assertUniqueSlugs, sortPosts } from './view-models/blog';
import type { ProjectEntry } from './view-models/projects';

/** Single-file collections use their own name as the entry id (see content.config.ts). */
function required<T>(entry: { data: T } | undefined, file: string): T {
  if (!entry) throw new Error(`src/content/${file} is missing`);
  return entry.data;
}

export const getSettings = async (): Promise<Settings> =>
  required(await getEntry('settings', 'settings'), 'settings.json');

export const getSections = async (): Promise<Sections> =>
  required(await getEntry('sections', 'sections'), 'sections.json');

export const getSubsidyRules = async (): Promise<SubsidyRules> =>
  required(await getEntry('subsidy', 'subsidy'), 'subsidy.json');

export const getChat = async (): Promise<ChatContent> =>
  required(await getEntry('chat', 'chat'), 'chat.json');

/** FAQs in file order. */
export async function getFaqs(): Promise<Faq[]> {
  const entries = await getCollection('faqs');
  return entries.sort((a, b) => a.id.localeCompare(b.id)).map((e) => e.data);
}

/** All project entries, drafts included; toProjectsView() filters and orders them. */
export async function getProjects(): Promise<ProjectEntry[]> {
  return getCollection('projects');
}

/**
 * Blog posts in display order. Drafts are included by default because the blog page lists them
 * as "coming soon" cards; pass { includeDrafts: false } for article pages, RSS and the sitemap.
 */
export async function getPosts({ includeDrafts = true } = {}): Promise<BlogPost[]> {
  const entries = await getCollection('blog', (e) => includeDrafts || !e.data.draft);
  assertUniqueSlugs(entries.map((e) => e.id));
  return sortPosts(entries);
}

export type BlogPost = CollectionEntry<'blog'>;

/** Renders an article's Markdown body; returns the <Content /> component and its headings. */
export const renderPost = (post: BlogPost) => render(post);
