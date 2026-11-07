/**
 * Test fixtures for content. Deliberately different from src/content so a SAEL edit
 * (a new rate, a new post) can never break the tests.
 */
import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import type { ImageField } from '../../src/lib/schemas/common';
import type { BlogRefField } from '../../src/lib/schemas/chat';
import type { SubsidyRules } from '../../src/lib/schemas/subsidy';
import type { BlogEntry } from '../../src/lib/view-models/blog';
import type { ProjectEntry } from '../../src/lib/view-models/projects';

export const fakeImage = (name: string): ImageMetadata => ({
  src: `/_fixtures/${name}.jpg`,
  width: 1200,
  height: 800,
  format: 'jpg',
});

/** Stand-in for Astro's image() helper: accepts a fixture image object. */
export const imageStub: ImageField = () =>
  z.custom<ImageMetadata>(
    (v) => typeof v === 'object' && v !== null && 'src' in v && 'width' in v,
    'Expected an image',
  );

/** Stand-in for reference('blog'): turns a slug into a reference object. */
export const blogRefStub: BlogRefField = () =>
  z.string().transform((id) => ({ collection: 'blog' as const, id }));

export const subsidyFixture: SubsidyRules = {
  central: {
    name: 'Test scheme',
    slabs: [
      { fromKw: 0, toKw: 2, perKw: 20000 },
      { fromKw: 2, toKw: 3, perKw: 10000 },
    ],
    cap: 50000,
  },
  defaultStateId: 'AA',
  fallbackStateId: 'ZZ',
  states: [
    { id: 'AA', name: 'Alpha', note: 'No top-up.' },
    { id: 'BB', name: 'Beta', perKw: 5000, cap: 8000 },
    { id: 'ZZ', name: 'Other states' },
  ],
};

const project = (id: string, data: Partial<ProjectEntry['data']>): ProjectEntry => ({
  id,
  data: { title: id, kind: 'solar', layout: 'card', order: 100, draft: false, ...data },
});

export const projectsFixture: ProjectEntry[] = [
  project('mini-b', {
    title: 'Confidential',
    size: '1 MW',
    kind: 'ground mount',
    layout: 'mini',
    order: 21,
  }),
  project('card-no-photo', {
    title: 'No Photo Co',
    size: '4 MW',
    location: 'Kerala',
    summary: 'A card.',
    order: 10,
  }),
  project('feature', {
    title: 'Our installs',
    kind: 'Rooftop',
    location: 'Kerala · Karnataka',
    image: fakeImage('feature'),
    alt: 'A feature photo',
    credit: 'Photo: Test',
    layout: 'feature',
    order: 1,
  }),
  project('draft-card', { title: 'Hidden', layout: 'card', order: 5, draft: true }),
  project('mini-a', {
    title: 'Confidential',
    size: '2 MW',
    kind: 'power facilitation',
    layout: 'mini',
    order: 20,
  }),
  project('mini-no-size', { title: 'Secret site', kind: 'rooftop', layout: 'mini', order: 22 }),
];

const post = (id: string, data: Partial<BlogEntry['data']>): BlogEntry => ({
  id,
  data: {
    title: `Title of ${id}`,
    topic: 'Solar basics',
    cover: fakeImage(id),
    coverAlt: `Cover for ${id}`,
    draft: true,
    ...data,
  },
});

export const postsFixture: BlogEntry[] = [
  post('draft-perf', { topic: 'Performance' }),
  post('old-post', {
    draft: false,
    topic: 'Monsoon',
    description: 'An older published fixture post with a long enough description.',
    publishDate: new Date('2026-10-01T09:00:00+05:30'),
  }),
  post('draft-subsidy', { topic: 'Subsidy & schemes' }),
  post('new-post', {
    draft: false,
    topic: 'Solar basics',
    description: 'A newer published fixture post with a long enough description.',
    publishDate: new Date('2026-11-05T09:00:00+05:30'),
  }),
  post('draft-basics', { topic: 'Solar basics' }),
];
