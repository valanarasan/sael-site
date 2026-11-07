import { describe, expect, it } from 'vitest';
import {
  assertUniqueSlugs,
  postHref,
  sortPosts,
  toPostCard,
  topicsInUse,
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
