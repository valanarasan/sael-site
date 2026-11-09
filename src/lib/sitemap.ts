/**
 * sitemap.xml and robots.txt builders. Small enough to own instead of adding a dependency; pure, so
 * the output is unit-tested. Locations must already be absolute.
 */
import { escapeXml } from './rss';

export interface SitemapEntry {
  loc: string;
  lastmod?: Date;
}

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map(({ loc, lastmod }) =>
    [
      '<url>',
      `<loc>${escapeXml(loc)}</loc>`,
      ...(lastmod ? [`<lastmod>${dateOnly(lastmod)}</lastmod>`] : []),
      '</url>',
    ].join(''),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Keeps crawlers out of the API. The enquiry result pages stay crawlable on purpose: they say
 * noindex, and a crawler has to be able to read that.
 */
export function buildRobots(sitemapUrl: string): string {
  return ['User-agent: *', 'Disallow: /api/', '', `Sitemap: ${sitemapUrl}`, ''].join('\n');
}
