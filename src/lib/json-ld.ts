/** Structured data (schema.org JSON-LD) builders. Pure; pages print the result in a script tag. */

/**
 * JSON for a <script type="application/ld+json"> block. "<" is escaped so text from content can
 * never close the script element early.
 */
export function jsonLdString(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
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
