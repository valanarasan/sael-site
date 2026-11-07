import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postsFixture, projectsFixture, subsidyFixture } from '../fixtures/content';
import { settingsFixture } from '../fixtures/settings';

type Entry = { id: string; data: unknown };

const getEntry = vi.fn();
const collections: Record<string, Entry[]> = {};
const getCollection = vi.fn(async (name: string, filter?: (e: Entry) => boolean) => {
  const all = collections[name] ?? [];
  return filter ? all.filter(filter) : all;
});
const render = vi.fn(async () => ({ Content: 'Rendered', headings: [] }));
vi.mock('astro:content', () => ({ getEntry, getCollection, render }));

const repo = await import('../../src/lib/content');

describe('single-file content', () => {
  beforeEach(() => getEntry.mockReset());

  it.each([
    ['getSettings', 'settings', settingsFixture],
    ['getSubsidyRules', 'subsidy', subsidyFixture],
    ['getSections', 'sections', { hero: {} }],
    ['getChat', 'chat', { title: 'Chat' }],
  ] as const)('%s reads the %s entry', async (fn, collection, data) => {
    getEntry.mockResolvedValue({ id: collection, data });
    await expect(repo[fn]()).resolves.toEqual(data);
    expect(getEntry).toHaveBeenCalledWith(collection, collection);
  });

  it('fails clearly when a file is missing', async () => {
    getEntry.mockResolvedValue(undefined);
    await expect(repo.getSettings()).rejects.toThrow(/settings\.json is missing/);
    await expect(repo.getSubsidyRules()).rejects.toThrow(/subsidy\.json is missing/);
  });
});

describe('getFaqs', () => {
  it('returns FAQs in file order (by their position ids)', async () => {
    collections.faqs = [
      { id: '02', data: { question: 'Second?', answer: 'Second answer.' } },
      { id: '10', data: { question: 'Tenth?', answer: 'Tenth answer.' } },
      { id: '01', data: { question: 'First?', answer: 'First answer.' } },
    ];
    const faqs = await repo.getFaqs();
    expect(faqs.map((f) => f.question)).toEqual(['First?', 'Second?', 'Tenth?']);
  });
});

describe('getProjects', () => {
  it('returns every project entry for the view model to filter', async () => {
    collections.projects = projectsFixture;
    await expect(repo.getProjects()).resolves.toHaveLength(projectsFixture.length);
  });
});

describe('getPosts', () => {
  beforeEach(() => {
    collections.blog = postsFixture;
  });

  it('includes drafts by default, sorted for display', async () => {
    const posts = await repo.getPosts();
    expect(posts.map((p) => p.id)).toEqual([
      'new-post',
      'old-post',
      'draft-subsidy',
      'draft-basics',
      'draft-perf',
    ]);
  });

  it('can leave drafts out', async () => {
    const posts = await repo.getPosts({ includeDrafts: false });
    expect(posts.map((p) => p.id)).toEqual(['new-post', 'old-post']);
  });

  it('refuses two posts that would share a URL', async () => {
    const [first] = postsFixture;
    if (!first) throw new Error('fixture missing');
    collections.blog = [first, { ...first, id: first.id.toUpperCase() }];
    await expect(repo.getPosts()).rejects.toThrow(/share the URL/);
  });
});

describe('renderPost', () => {
  it('renders the given post through astro:content', async () => {
    const post = { id: 'om-amc', collection: 'blog', data: {} };
    await expect(repo.renderPost(post as never)).resolves.toMatchObject({ Content: 'Rendered' });
    expect(render).toHaveBeenCalledWith(post);
  });
});
