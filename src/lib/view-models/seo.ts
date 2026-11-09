/** Maps content to the search-engine outputs: the sitemap and the local-business details. */
import type { LocalBusinessInput } from '../json-ld';
import type { SitemapEntry } from '../sitemap';
import type { Settings } from '../schemas/settings';
import { postHref } from './blog';

interface PostForSitemap {
  id: string;
  data: { publishDate?: Date | undefined; updatedDate?: Date | undefined };
}

/** Pass published posts only; drafts have no page. */
export function toSitemapEntries(posts: PostForSitemap[], site: URL | string): SitemapEntry[] {
  return [
    { loc: new URL('/', site).href },
    { loc: new URL('/blog', site).href },
    ...posts.map(({ id, data }) => {
      const lastmod = data.updatedDate ?? data.publishDate;
      return { loc: new URL(postHref(id), site).href, ...(lastmod ? { lastmod } : {}) };
    }),
  ];
}

/**
 * Offices with a complete postal address become locations; the others are left out, because search
 * engines reject a local business with a partial one.
 */
export function toLocalBusinessInput(
  settings: Settings,
  urls: { url: string; logoUrl: string; imageUrl: string },
): LocalBusinessInput {
  const { company, contact, offices, seo } = settings;
  const locations = offices.flatMap((office) => {
    const { street, city, state, postalCode, country } = office;
    if (!street || !city || !state || !postalCode || !country) return [];
    return [
      {
        name: office.name,
        telephone: office.phone?.e164 ?? contact.phone.e164,
        email: office.email ?? contact.email,
        address: { street, city, state, postalCode, country },
      },
    ];
  });
  return {
    ...urls,
    name: company.name,
    legalName: company.legalName,
    description: seo.description,
    telephone: contact.phone.e164,
    email: contact.email,
    locations,
  };
}
