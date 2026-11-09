/** robots.txt, built here so the sitemap address follows the site's domain. */
import type { APIRoute } from 'astro';
import { buildRobots } from '../lib/sitemap';

export const prerender = true;

export const GET: APIRoute = ({ site, url }) =>
  new Response(buildRobots(new URL('/sitemap.xml', site ?? url.origin).href), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
