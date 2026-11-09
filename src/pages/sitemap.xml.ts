/** Every page search engines should list: home, the blog and published articles. */
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/content';
import { buildSitemap } from '../lib/sitemap';
import { toSitemapEntries } from '../lib/view-models/seo';

export const prerender = true;

export const GET: APIRoute = async ({ site, url }) => {
  const posts = await getPosts({ includeDrafts: false });
  const xml = buildSitemap(toSitemapEntries(posts, site ?? url.origin));
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
