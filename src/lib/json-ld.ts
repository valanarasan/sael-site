/** Structured data (schema.org JSON-LD) builders. Pure; pages print the result in a script tag. */

/**
 * JSON for a <script type="application/ld+json"> block. "<" is escaped so text from content can
 * never close the script element early.
 */
export function jsonLdString(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface LocalBusinessInput {
  url: string;
  name: string;
  legalName: string;
  description: string;
  logoUrl: string;
  imageUrl: string;
  telephone: string;
  email: string;
  locations: {
    name: string;
    telephone: string;
    email: string;
    address: { street: string; city: string; state: string; postalCode: string; country: string };
  }[];
}

/**
 * The company, plus one LocalBusiness per office. Only facts from the content: no opening hours,
 * map coordinates, prices or ratings until SAEL provides them.
 */
export function toLocalBusinessJsonLd(input: LocalBusinessInput): Record<string, unknown> {
  const organizationId = `${input.url}#organization`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: input.name,
        legalName: input.legalName,
        url: input.url,
        logo: input.logoUrl,
        telephone: input.telephone,
        email: input.email,
      },
      ...input.locations.map((location, index) => ({
        '@type': 'LocalBusiness',
        '@id': `${input.url}#location-${index + 1}`,
        name: `${input.name} ${location.name}`,
        description: input.description,
        url: input.url,
        image: input.imageUrl,
        logo: input.logoUrl,
        telephone: location.telephone,
        email: location.email,
        parentOrganization: { '@id': organizationId },
        address: {
          '@type': 'PostalAddress',
          streetAddress: location.address.street,
          addressLocality: location.address.city,
          addressRegion: location.address.state,
          postalCode: location.address.postalCode,
          addressCountry: location.address.country,
        },
      })),
    ],
  };
}

export interface BlogPostingInput {
  url: string;
  title: string;
  description?: string;
  imageUrl: string;
  published: Date;
  updated?: Date;
  author?: string;
  topic: string;
  publisher: { name: string; logoUrl: string };
}

export function toBlogPostingJsonLd(post: BlogPostingInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: { '@type': 'WebPage', '@id': post.url },
    headline: post.title,
    ...(post.description ? { description: post.description } : {}),
    image: [post.imageUrl],
    datePublished: post.published.toISOString(),
    dateModified: (post.updated ?? post.published).toISOString(),
    articleSection: post.topic,
    inLanguage: 'en-IN',
    // A named author is a person; otherwise the company wrote it.
    author: post.author
      ? { '@type': 'Person', name: post.author }
      : { '@type': 'Organization', name: post.publisher.name },
    publisher: {
      '@type': 'Organization',
      name: post.publisher.name,
      logo: { '@type': 'ImageObject', url: post.publisher.logoUrl },
    },
  };
}
