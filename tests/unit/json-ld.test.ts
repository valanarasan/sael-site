import { describe, expect, it } from 'vitest';
import { jsonLdString, toBlogPostingJsonLd } from '../../src/lib/json-ld';

const input = {
  url: 'https://example.com/blog/om-amc',
  title: 'How AMC helps',
  imageUrl: 'https://example.com/_astro/cover.jpg',
  published: new Date('2026-11-05T03:30:00Z'),
  topic: 'O&M & AMC',
  publisher: { name: 'SAEL Energy', logoUrl: 'https://example.com/_astro/logo.png' },
};

describe('jsonLdString', () => {
  it('escapes "<" so content cannot close the script tag', () => {
    const out = jsonLdString({ headline: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ headline: '</script><script>alert(1)</script>' });
  });
});

describe('toBlogPostingJsonLd', () => {
  it('describes the article, credits the company when no author is named', () => {
    expect(toBlogPostingJsonLd(input)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
      headline: 'How AMC helps',
      image: [input.imageUrl],
      datePublished: '2026-11-05T03:30:00.000Z',
      dateModified: '2026-11-05T03:30:00.000Z',
      articleSection: 'O&M & AMC',
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'SAEL Energy' },
      publisher: {
        '@type': 'Organization',
        name: 'SAEL Energy',
        logo: { '@type': 'ImageObject', url: input.publisher.logoUrl },
      },
    });
  });

  it('adds the description, update date and a named author', () => {
    const ld = toBlogPostingJsonLd({
      ...input,
      description: 'Why maintenance matters.',
      updated: new Date('2026-11-07T03:30:00Z'),
      author: 'Renny',
    });
    expect(ld.description).toBe('Why maintenance matters.');
    expect(ld.dateModified).toBe('2026-11-07T03:30:00.000Z');
    expect(ld.author).toEqual({ '@type': 'Person', name: 'Renny' });
  });
});
