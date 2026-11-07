// Component tests: blog cards, grid, article header, call to action and related posts.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import BlogGrid from '../../src/components/islands/BlogGrid.astro';
import ArticleCta from '../../src/components/sections/ArticleCta.astro';
import ArticleHeader from '../../src/components/sections/ArticleHeader.astro';
import BlogIntro from '../../src/components/sections/BlogIntro.astro';
import RelatedPosts from '../../src/components/sections/RelatedPosts.astro';
import PostCard from '../../src/components/ui/PostCard.astro';
import {
  toArticleView,
  toPostCard,
  type BlogEntry,
  type PostCardProps,
} from '../../src/lib/view-models/blog';
import { postsFixture } from '../fixtures/content';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = async (
  component: Parameters<AstroContainer['renderToString']>[0],
  props: Record<string, unknown>,
) =>
  (await container.renderToString(component, { props })).replace(
    / data-astro-cid-\w+(="true")?/g,
    '',
  );

const entry = (id: string): BlogEntry => {
  const found = postsFixture.find((p) => p.id === id);
  if (!found) throw new Error(`fixture ${id} missing`);
  return found;
};
const published: PostCardProps = toPostCard({ ...entry('new-post'), body: 'word '.repeat(450) });
const draft: PostCardProps = toPostCard(entry('draft-perf'));
const cardLabels = { comingSoonLabel: 'Coming soon', readingTimeLabel: '{minutes} min read' };

describe('PostCard', () => {
  it('links a published post and shows its date and reading time', async () => {
    const html = await render(PostCard, { post: published, ...cardLabels, sizes: '100vw' });
    expect(html).toMatch(/<article class="bp linked" id="new-post" data-topic="Solar basics"/);
    expect(html).toContain('<h2><a href="/blog/new-post">Title of new-post</a></h2>');
    expect(html).toContain('<time datetime="2026-11-05">5 Nov 2026</time> · 3 min read');
    expect(html).toContain('alt="Cover for new-post"');
    expect(html).toContain('loading="lazy"');
  });

  it('shows a draft as coming soon, without a link', async () => {
    const html = await render(PostCard, { post: draft, ...cardLabels, sizes: '100vw' });
    expect(html).not.toContain('<a ');
    expect(html).toContain('<h2>Title of draft-perf</h2>');
    expect(html).toContain('Coming soon');
    expect(html).not.toContain('linked');
  });

  it('uses h3 under another heading, and loads the featured image first', async () => {
    const html = await render(PostCard, {
      post: published,
      ...cardLabels,
      sizes: '100vw',
      level: 3,
      featured: true,
      priority: true,
    });
    expect(html).toContain('<h3><a href="/blog/new-post">');
    expect(html).toMatch(/class="bp feat linked"/);
    expect(html).toContain('fetchpriority="high"');
  });
});

describe('BlogIntro', () => {
  it('renders the page h1 with the serif accent', async () => {
    const html = await render(BlogIntro, {
      eyebrow: 'SAEL Blog',
      heading: 'Solar, *explained*.',
      intro: 'Straight answers.',
    });
    expect(html).toMatch(/<h1 id="blog-title">Solar, <em class="s">explained<\/em>\.<\/h1>/);
    expect(html).toContain('aria-labelledby="blog-title"');
  });
});

describe('BlogGrid', () => {
  const labels = {
    filter: 'Filter articles',
    all: 'All',
    comingSoon: 'Coming soon',
    readingTime: '{minutes} min read',
    status: { one: 'Showing 1 article', other: 'Showing {count} articles' },
  };

  it('renders an "All" button plus one per topic, and features the first card', async () => {
    const html = await render(BlogGrid, {
      posts: [published, draft],
      topics: ['Solar basics', 'Performance'],
      labels,
    });
    expect(html).toContain('role="group" aria-label="Filter articles"');
    expect(html).toContain('<button type="button" aria-pressed="true" data-topic="">All</button>');
    expect(html).toContain('aria-pressed="false" data-topic="Performance">Performance</button>');
    expect((html.match(/<button /g) ?? []).length).toBe(3);
    expect((html.match(/data-post-card/g) ?? []).length).toBe(2);
    expect((html.match(/class="bp feat/g) ?? []).length).toBe(1);
    expect(html).toMatch(/aria-live="polite" data-blog-status data-one="Showing 1 article"/);
  });

  it('leaves out the filters when there is only one topic', async () => {
    const html = await render(BlogGrid, { posts: [published], topics: ['Solar basics'], labels });
    expect(html).not.toContain('role="group"');
  });
});

describe('ArticleHeader', () => {
  const labels = { back: 'All articles', by: 'By', published: 'Published', updated: 'Updated' };

  it('renders the title as h1 with the byline, dates and reading time', async () => {
    const base = entry('new-post');
    const article = toArticleView({
      ...base,
      data: { ...base.data, author: 'Renny', updatedDate: new Date('2026-11-07T09:00:00+05:30') },
    });
    const html = await render(ArticleHeader, {
      article,
      backHref: '/blog',
      readingTime: '4 min read',
      labels,
    });
    expect(html).toContain('<a class="back" href="/blog">');
    expect(html).toContain('<h1>Title of new-post</h1>');
    expect(html).toContain('class="lede"');
    expect(html).toContain('By Renny');
    expect(html).toContain('Published <time datetime="2026-11-05">5 Nov 2026</time>');
    expect(html).toContain('Updated <time datetime="2026-11-07">7 Nov 2026</time>');
    expect(html).toContain('4 min read');
    expect(html).toContain('fetchpriority="high"');
  });

  it('leaves out what a draft does not have', async () => {
    const html = await render(ArticleHeader, {
      article: toArticleView(entry('draft-perf')),
      backHref: '/blog',
      readingTime: '1 min read',
      labels,
    });
    expect(html).not.toMatch(/Published|Updated|By |class="lede"/);
  });
});

describe('ArticleCta', () => {
  it('offers the survey and a WhatsApp link that opens safely in a new tab', async () => {
    const html = await render(ArticleCta, {
      heading: 'Book your free *site survey*.',
      text: 'Leave your number.',
      primary: { label: 'Free site survey', href: '/#contact' },
      whatsapp: { label: 'Ask on WhatsApp', href: 'https://wa.me/919000000001?text=Hi' },
    });
    expect(html).toContain('aria-labelledby="article-cta"');
    expect(html).toContain('<em class="s">site survey</em>');
    expect(html).toMatch(/href="\/#contact" class="btn b-cop/);
    expect(html).toMatch(
      /href="https:\/\/wa\.me\/919000000001\?text=Hi"[^>]*target="_blank" rel="noopener noreferrer"/,
    );
  });
});

describe('RelatedPosts', () => {
  it('lists cards under an h2, with h3 titles', async () => {
    const html = await render(RelatedPosts, {
      heading: 'More from the *blog*',
      posts: [published],
      ...cardLabels,
    });
    expect(html).toMatch(/<h2 id="related-title">More from the <em class="s">blog<\/em><\/h2>/);
    expect(html).toContain('<h3><a href="/blog/new-post">');
  });

  it('renders nothing when there are no other articles', async () => {
    const html = await render(RelatedPosts, { heading: 'More', posts: [], ...cardLabels });
    expect(html.trim()).toBe('');
  });
});
