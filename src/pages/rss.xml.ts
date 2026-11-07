/** RSS feed of published articles (drafts never appear). */
import type { APIRoute } from 'astro';
import { getPosts, getSections } from '../lib/content';
import { buildRss } from '../lib/rss';
import { toRssItems } from '../lib/view-models/blog';

export const prerender = true;

export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? url.origin;
  const [sections, posts] = await Promise.all([getSections(), getPosts({ includeDrafts: false })]);
  const xml = buildRss({
    title: sections.blog.feedTitle,
    description: sections.blog.seoDescription,
    link: new URL('/blog', base).href,
    feedUrl: new URL('/rss.xml', base).href,
    items: toRssItems(posts, base),
  });
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
