/** Adapters from blog entries to card and filter props. */
import type { ImageMetadata } from 'astro';
import { formatDate, isoDate } from '../format';
import { readingMinutes } from '../reading-time';
import type { RssItem } from '../rss';
import { BLOG_TOPICS, type BlogPostData, type BlogTopic } from '../schemas/blog';

export interface BlogEntry {
  id: string;
  data: BlogPostData;
  /** Raw Markdown body (present on collection entries; used for reading time). */
  body?: string;
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
  /** Published posts only. */
  readingMinutes?: number;
}

export interface DateLabel {
  iso: string;
  label: string;
}

export interface ArticleView {
  slug: string;
  title: string;
  description?: string;
  topic: BlogTopic;
  cover: { src: ImageMetadata; alt: string };
  published?: DateLabel;
  /** Only when it falls on a later day than the publish date. */
  updated?: DateLabel;
  author?: string;
  readingMinutes: number;
  draft: boolean;
}

export function postHref(slug: string): string {
  return `/blog/${slug}`;
}

const dateLabel = (date: Date): DateLabel => ({ iso: isoDate(date), label: formatDate(date) });

export function toPostCard({ id, data, body }: BlogEntry): PostCardProps {
  return {
    slug: id,
    href: postHref(id),
    title: data.title,
    topic: data.topic,
    cover: { src: data.cover, alt: data.coverAlt },
    ...(data.publishDate ? { date: dateLabel(data.publishDate) } : {}),
    comingSoon: data.draft,
    ...(!data.draft && body !== undefined ? { readingMinutes: readingMinutes(body) } : {}),
  };
}

export function toArticleView({ id, data, body = '' }: BlogEntry): ArticleView {
  const published = data.publishDate ? dateLabel(data.publishDate) : undefined;
  const updated = data.updatedDate ? dateLabel(data.updatedDate) : undefined;
  return {
    slug: id,
    title: data.title,
    ...(data.description ? { description: data.description } : {}),
    topic: data.topic,
    cover: { src: data.cover, alt: data.coverAlt },
    ...(published ? { published } : {}),
    ...(updated && updated.iso !== published?.iso ? { updated } : {}),
    ...(data.author ? { author: data.author } : {}),
    readingMinutes: readingMinutes(body),
    draft: data.draft,
  };
}

/**
 * Up to `limit` other published posts: same topic first, then the rest, each in the order given
 * (getPosts() already sorts newest first). Drafts never appear: they have no page to link to.
 */
export function relatedPosts<T extends BlogEntry>(current: BlogEntry, all: T[], limit = 3): T[] {
  const others = all.filter((e) => !e.data.draft && e.id !== current.id);
  const same = others.filter((e) => e.data.topic === current.data.topic);
  const rest = others.filter((e) => e.data.topic !== current.data.topic);
  return [...same, ...rest].slice(0, limit);
}

/** Feed items for published posts, with absolute links. */
export function toRssItems(entries: BlogEntry[], site: string | URL): RssItem[] {
  return entries.flatMap(({ id, data }) =>
    !data.draft && data.publishDate
      ? [
          {
            title: data.title,
            link: new URL(postHref(id), site).href,
            pubDate: data.publishDate,
            category: data.topic,
            ...(data.description ? { description: data.description } : {}),
          },
        ]
      : [],
  );
}

/**
 * Published posts first, newest first; then drafts in topic order (as the v5 blog page lists them),
 * by their `order` within a topic, then file order.
 */
export function sortPosts<T extends BlogEntry>(entries: T[]): T[] {
  const topicIndex = (e: T) => BLOG_TOPICS.indexOf(e.data.topic);
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
    .sort(
      (a, b) =>
        topicIndex(a.e) - topicIndex(b.e) ||
        (a.e.data.order ?? Infinity) - (b.e.data.order ?? Infinity) ||
        a.i - b.i,
    )
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
