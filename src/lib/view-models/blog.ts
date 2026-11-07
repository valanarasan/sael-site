/** Adapters from blog entries to card and filter props. */
import type { ImageMetadata } from 'astro';
import { formatDate, isoDate } from '../format';
import { BLOG_TOPICS, type BlogPostData, type BlogTopic } from '../schemas/blog';

export interface BlogEntry {
  id: string;
  data: BlogPostData;
}

export interface PostCardProps {
  slug: string;
  href: string;
  title: string;
  topic: BlogTopic;
  cover: { src: ImageMetadata; alt: string };
  /** Missing for drafts without a date. */
  date?: { iso: string; label: string };
  /** Drafts show as "Article coming soon" and don't link to an article page yet. */
  comingSoon: boolean;
}

export function postHref(slug: string): string {
  return `/blog/${slug}`;
}

export function toPostCard({ id, data }: BlogEntry): PostCardProps {
  return {
    slug: id,
    href: postHref(id),
    title: data.title,
    topic: data.topic,
    cover: { src: data.cover, alt: data.coverAlt },
    ...(data.publishDate
      ? { date: { iso: isoDate(data.publishDate), label: formatDate(data.publishDate) } }
      : {}),
    comingSoon: data.draft,
  };
}

/**
 * Published posts first, newest first; then drafts in topic order (as the v5 blog page lists them),
 * keeping file order within a topic.
 */
export function sortPosts(entries: BlogEntry[]): BlogEntry[] {
  const topicIndex = (e: BlogEntry) => BLOG_TOPICS.indexOf(e.data.topic);
  const published = entries
    .filter((e) => !e.data.draft)
    .sort(
      (a, b) =>
        (b.data.publishDate?.getTime() ?? 0) - (a.data.publishDate?.getTime() ?? 0) ||
        a.data.title.localeCompare(b.data.title),
    );
  const drafts = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.data.draft)
    .sort((a, b) => topicIndex(a.e) - topicIndex(b.e) || a.i - b.i)
    .map(({ e }) => e);
  return [...published, ...drafts];
}

/** Topics that have at least one post, in the standard order (for the filter buttons). */
export function topicsInUse(entries: BlogEntry[]): BlogTopic[] {
  const used = new Set(entries.map((e) => e.data.topic));
  return BLOG_TOPICS.filter((t) => used.has(t));
}

/** Throws if two posts would share a URL (slugs compared without case). */
export function assertUniqueSlugs(slugs: string[]): void {
  const seen = new Map<string, string>();
  for (const slug of slugs) {
    const key = slug.toLowerCase();
    const other = seen.get(key);
    if (other !== undefined)
      throw new Error(`Two blog posts share the URL /blog/${key}: "${other}" and "${slug}"`);
    seen.set(key, slug);
  }
}
