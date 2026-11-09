import { describe, expect, it } from 'vitest';
import { toLocalBusinessJsonLd } from '../../src/lib/json-ld';
import { settingsSchema, type Settings } from '../../src/lib/schemas/settings';
import { buildRobots, buildSitemap } from '../../src/lib/sitemap';
import { toLocalBusinessInput, toSitemapEntries } from '../../src/lib/view-models/seo';
import { settingsFixture } from '../fixtures/settings';

const SITE = 'https://example.com';
const URLS = {
  url: `${SITE}/`,
  logoUrl: `${SITE}/logo.png`,
  imageUrl: `${SITE}/share.jpg`,
};
const ADDRESS = {
  street: '1 Test Street',
  city: 'Testville',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'IN',
};

const withOffices = (offices: Settings['offices']): Settings => ({ ...settingsFixture, offices });

describe('buildSitemap', () => {
  it('lists each page, with a date only when there is one', () => {
    const xml = buildSitemap([
      { loc: `${SITE}/` },
      { loc: `${SITE}/blog/om`, lastmod: new Date('2026-11-05T03:30:00Z') },
    ]);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<url><loc>${SITE}/</loc></url>`);
    expect(xml).toContain(`<url><loc>${SITE}/blog/om</loc><lastmod>2026-11-05</lastmod></url>`);
  });

  it('escapes addresses', () => {
    expect(buildSitemap([{ loc: `${SITE}/?a=1&b=2` }])).toContain('?a=1&amp;b=2');
  });
});

describe('buildRobots', () => {
  it('names the sitemap, blocks the API and leaves the pages open', () => {
    const robots = buildRobots(`${SITE}/sitemap.xml`);
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(robots).not.toContain('/enquiry');
  });
});

describe('toSitemapEntries', () => {
  it('lists home, the blog and each post, preferring the updated date', () => {
    const published = new Date('2026-01-01');
    const updated = new Date('2026-02-01');
    expect(
      toSitemapEntries(
        [
          { id: 'first', data: { publishDate: published } },
          { id: 'second', data: { publishDate: published, updatedDate: updated } },
          { id: 'undated', data: {} },
        ],
        SITE,
      ),
    ).toEqual([
      { loc: `${SITE}/` },
      { loc: `${SITE}/blog` },
      { loc: `${SITE}/blog/first`, lastmod: published },
      { loc: `${SITE}/blog/second`, lastmod: updated },
      { loc: `${SITE}/blog/undated` },
    ]);
  });
});

describe('toLocalBusinessInput', () => {
  it('uses the office phone and email when it has them', () => {
    const { locations } = toLocalBusinessInput(
      withOffices([
        {
          name: 'Bangalore',
          phone: { display: '+91 90000 00009', e164: '+919000000009' },
          email: 'blr@example.com',
          ...ADDRESS,
        },
      ]),
      URLS,
    );
    expect(locations).toEqual([
      { name: 'Bangalore', telephone: '+919000000009', email: 'blr@example.com', address: ADDRESS },
    ]);
  });

  it('falls back to the main phone and email', () => {
    const [location] = toLocalBusinessInput(
      withOffices([{ name: 'Bangalore', ...ADDRESS }]),
      URLS,
    ).locations;
    expect(location?.telephone).toBe(settingsFixture.contact.phone.e164);
    expect(location?.email).toBe(settingsFixture.contact.email);
  });

  it.each(Object.keys(ADDRESS))('leaves out an office with no %s', (field) => {
    const office = { name: 'Partial', ...ADDRESS, [field]: undefined };
    const { locations } = toLocalBusinessInput(withOffices([office]), URLS);
    expect(locations).toEqual([]);
  });

  it('still describes the company when no office has an address', () => {
    const input = toLocalBusinessInput(withOffices([{ name: 'Overseas' }]), URLS);
    expect(input.name).toBe(settingsFixture.company.name);
    expect(input.legalName).toBe(settingsFixture.company.legalName);
    expect(input.description).toBe(settingsFixture.seo.description);
    expect(input.locations).toEqual([]);
  });
});

describe('toLocalBusinessJsonLd', () => {
  const graph = (locations: number) => {
    const data = toLocalBusinessJsonLd({
      ...URLS,
      name: 'Test Solar',
      legalName: 'Test Solar LLP',
      description: 'Solar.',
      telephone: '+919000000001',
      email: 'hello@example.com',
      locations: Array.from({ length: locations }, (_, i) => ({
        name: `Office ${i + 1}`,
        telephone: '+919000000002',
        email: 'office@example.com',
        address: ADDRESS,
      })),
    });
    expect(data['@context']).toBe('https://schema.org');
    return data['@graph'] as Record<string, unknown>[];
  };

  it('has one company and one LocalBusiness per office, linked together', () => {
    const [company, first, second] = graph(2);
    expect(company).toMatchObject({ '@type': 'Organization', legalName: 'Test Solar LLP' });
    expect(first).toMatchObject({
      '@type': 'LocalBusiness',
      name: 'Test Solar Office 1',
      telephone: '+919000000002',
      parentOrganization: { '@id': company?.['@id'] },
    });
    expect(first?.['@id']).not.toBe(second?.['@id']);
  });

  it('writes the address in schema.org terms', () => {
    expect(graph(1)[1]?.['address']).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '1 Test Street',
      addressLocality: 'Testville',
      addressRegion: 'Karnataka',
      postalCode: '560001',
      addressCountry: 'IN',
    });
  });

  it('adds nothing SAEL has not provided', () => {
    const text = JSON.stringify(graph(1));
    for (const invented of ['openingHours', 'geo', 'priceRange', 'aggregateRating']) {
      expect(text).not.toContain(invented);
    }
  });
});

describe('office address fields', () => {
  it('are optional and limited in length', () => {
    const parse = (office: Record<string, unknown>) =>
      settingsSchema.safeParse({ ...settingsFixture, offices: [office] }).success;
    expect(parse({ name: 'Bangalore' })).toBe(true);
    expect(parse({ name: 'Bangalore', ...ADDRESS })).toBe(true);
    expect(parse({ name: 'Bangalore', country: 'IND' })).toBe(false);
    expect(parse({ name: 'Bangalore', postalCode: '1'.repeat(13) })).toBe(false);
  });
});
