import { describe, expect, it } from 'vitest';
import {
  assertUniqueSlugs,
  postHref,
  relatedPosts,
  sortPosts,
  toArticleView,
  toPostCard,
  toRssItems,
  topicsInUse,
  type BlogEntry,
} from '../../src/lib/view-models/blog';
import { fakeImage, postsFixture } from '../fixtures/content';

const byId = (id: string) => {
  const entry = postsFixture.find((p) => p.id === id);
  if (!entry) throw new Error(`fixture ${id} missing`);
  return entry;
};

describe('toPostCard', () => {
  it('maps a published post with its date as "5 Nov 2026"', () => {
    expect(toPostCard(byId('new-post'))).toEqual({
      slug: 'new-post',
      href: '/blog/new-post',
      title: 'Title of new-post',
      topic: 'Solar basics',
      cover: { src: fakeImage('new-post'), alt: 'Cover for new-post' },
      date: { iso: '2026-11-05', label: '5 Nov 2026' },
      comingSoon: false,
    });
  });

  it('marks drafts as coming soon and leaves out a missing date', () => {
    const card = toPostCard(byId('draft-perf'));
    expect(card.comingSoon).toBe(true);
    expect(card).not.toHaveProperty('date');
  });
});

describe('postHref', () => {
  it('builds the article URL from the slug', () => {
    expect(postHref('om-amc')).toBe('/blog/om-amc');
  });
});

describe('sortPosts', () => {
  it('puts published posts first, newest first, then drafts in topic order', () => {
    expect(sortPosts(postsFixture).map((p) => p.id)).toEqual([
      'new-post',
      'old-post',
      'draft-subsidy',
      'draft-basics',
      'draft-perf',
    ]);
  });

  it('keeps file order for drafts in the same topic', () => {
    const a = { ...byId('draft-basics'), id: 'a' };
    const b = { ...byId('draft-basics'), id: 'b' };
    expect(sortPosts([b, a]).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('orders drafts within a topic by their order field, unnumbered ones last', () => {
    const draft = (id: string, order?: number) => ({
      ...byId('draft-basics'),
      id,
      data: { ...byId('draft-basics').data, ...(order ? { order } : {}) },
    });
    expect(sortPosts([draft('none'), draft('two', 2), draft('one', 1)]).map((p) => p.id)).toEqual([
      'one',
      'two',
      'none',
    ]);
  });

  it('does not change the input array', () => {
    const copy = [...postsFixture];
    sortPosts(postsFixture);
    expect(postsFixture).toEqual(copy);
  });
});

describe('topicsInUse', () => {
  it('lists topics that have posts, in the standard order', () => {
    expect(topicsInUse(postsFixture)).toEqual([
      'Subsidy & schemes',
      'Solar basics',
      'Monsoon',
      'Performance',
    ]);
  });

  it('is empty with no posts', () => {
    expect(topicsInUse([])).toEqual([]);
  });
});

describe('assertUniqueSlugs', () => {
  it('accepts unique slugs', () => {
    expect(() => assertUniqueSlugs(['om-amc', 'zero-bill'])).not.toThrow();
  });

  it('rejects slugs that differ only by case', () => {
    expect(() => assertUniqueSlugs(['om-amc', 'OM-AMC'])).toThrow(/\/blog\/om-amc/);
  });
});

describe('toPostCard reading time', () => {
  it('adds reading minutes to published posts that have a body', () => {
    const card = toPostCard({ ...byId('new-post'), body: 'word '.repeat(450) });
    expect(card.readingMinutes).toBe(3);
  });

  it('leaves it out for drafts and for entries without a body', () => {
    expect(toPostCard({ ...byId('draft-perf'), body: 'word '.repeat(450) })).not.toHaveProperty(
      'readingMinutes',
    );
    expect(toPostCard(byId('new-post'))).not.toHaveProperty('readingMinutes');
  });
});

describe('toArticleView', () => {
  const published = byId('new-post');

  it('maps a published article with its date and reading time', () => {
    expect(toArticleView({ ...published, body: 'word '.repeat(10) })).toEqual({
      slug: 'new-post',
      title: 'Title of new-post',
      description: 'A newer published fixture post with a long enough description.',
      topic: 'Solar basics',
      cover: { src: published.data.cover, alt: 'Cover for new-post' },
      published: { iso: '2026-11-05', label: '5 Nov 2026' },
      readingMinutes: 1,
      draft: false,
    });
  });

  it('shows the update date and author only when they add something', () => {
    const sameDay = toArticleView({
      ...published,
      data: { ...published.data, updatedDate: new Date('2026-11-05T18:00:00+05:30') },
    });
    expect(sameDay).not.toHaveProperty('updated');

    const later = toArticleView({
      ...published,
      data: {
        ...published.data,
        updatedDate: new Date('2026-11-07T09:00:00+05:30'),
        author: 'Renny',
      },
    });
    expect(later.updated).toEqual({ iso: '2026-11-07', label: '7 Nov 2026' });
    expect(later.author).toBe('Renny');
  });

  it('maps a draft without dates (dev preview)', () => {
    const view = toArticleView(byId('draft-perf'));
    expect(view.draft).toBe(true);
    expect(view).not.toHaveProperty('published');
    expect(view).not.toHaveProperty('description');
    expect(view.readingMinutes).toBe(1);
  });
});

describe('relatedPosts', () => {
  const pub = (id: string, topic: BlogEntry['data']['topic']): BlogEntry => ({
    id,
    data: { ...byId('new-post').data, topic },
  });
  const all = [
    pub('a-monsoon', 'Monsoon'),
    pub('b-basics', 'Solar basics'),
    pub('c-monsoon', 'Monsoon'),
    byId('draft-perf'),
    pub('d-perf', 'Performance'),
    pub('e-monsoon', 'Monsoon'),
  ];

  it('puts the same topic first, then others, skipping itself and drafts', () => {
    expect(relatedPosts(all[0] as BlogEntry, all).map((p) => p.id)).toEqual([
      'c-monsoon',
      'e-monsoon',
      'b-basics',
    ]);
  });

  it('fills from other topics in the given order and respects the limit', () => {
    expect(relatedPosts(all[4] as BlogEntry, all, 2).map((p) => p.id)).toEqual([
      'a-monsoon',
      'b-basics',
    ]);
  });

  it('is empty when nothing else is published', () => {
    expect(relatedPosts(byId('new-post'), [byId('new-post'), byId('draft-perf')])).toEqual([]);
  });
});

describe('toRssItems', () => {
  it('lists published posts with absolute links and skips drafts', () => {
    expect(toRssItems(postsFixture, 'https://example.com')).toEqual([
      {
        title: 'Title of old-post',
        link: 'https://example.com/blog/old-post',
        pubDate: new Date('2026-10-01T09:00:00+05:30'),
        category: 'Monsoon',
        description: 'An older published fixture post with a long enough description.',
      },
      {
        title: 'Title of new-post',
        link: 'https://example.com/blog/new-post',
        pubDate: new Date('2026-11-05T09:00:00+05:30'),
        category: 'Solar basics',
        description: 'A newer published fixture post with a long enough description.',
      },
    ]);
  });

  it('leaves out the description when a post has none', () => {
    const entry = byId('new-post');
    const { description: _, ...data } = entry.data;
    const [item] = toRssItems([{ ...entry, data }], new URL('https://example.com'));
    expect(item).not.toHaveProperty('description');
  });
});
