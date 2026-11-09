import { describe, expect, it } from 'vitest';
import { sectionsSchema } from '../../src/lib/schemas/sections';
import { imageStub } from '../fixtures/content';
import { sectionsFixture } from '../fixtures/sections';

const schema = sectionsSchema(imageStub);
const withChange = (change: (s: typeof sectionsFixture) => void) => {
  const copy = structuredClone(sectionsFixture);
  change(copy);
  return schema.safeParse(copy);
};

describe('sectionsSchema', () => {
  it('accepts valid content and fills placeholder defaults', () => {
    const r = schema.safeParse(sectionsFixture);
    expect(r.success).toBe(true);
    expect(r.data?.why.tiles.map((t) => t.placeholder)).toEqual([true, false]);
    expect(r.data?.engineering.stats.map((s) => s.placeholder)).toEqual([false, true]);
    expect(r.data?.contact.form.privacy.placeholder).toBe(false);
    expect(r.data?.systems.table.rows[0]?.tick).toBe(false);
  });

  it('rejects a headline line with an unpaired accent asterisk', () => {
    expect(withChange((s) => (s.hero.headline = ['all *around us'])).success).toBe(false);
  });

  it('needs at least one hero slide, each with alt text', () => {
    expect(withChange((s) => (s.hero.slides = [])).success).toBe(false);
    expect(withChange((s) => s.hero.slides.forEach((slide) => (slide.alt = ''))).success).toBe(
      false,
    );
  });

  it('rejects an unknown highlight icon', () => {
    expect(
      withChange((s) => (s.highlights.items[0] = { icon: 'rocket', title: 'X', text: 'Y' }))
        .success,
    ).toBe(false);
  });

  it('rejects an external link in a call to action', () => {
    expect(
      withChange((s) => (s.hero.primaryCta = { label: 'Go', href: 'https://example.com' })).success,
    ).toBe(false);
  });

  it('rejects an unknown token in the FAQ intro', () => {
    expect(withChange((s) => (s.faq.intro = 'Call {mobile}.')).success).toBe(false);
  });

  it('needs both day/night photos', () => {
    expect(withChange((s) => delete (s.dayNight.night as { image?: unknown }).image).success).toBe(
      false,
    );
  });

  it('needs at least one enquiry interest', () => {
    expect(withChange((s) => (s.contact.form.interests = [])).success).toBe(false);
  });

  it('keeps the {minutes} and {count} placeholders in blog labels', () => {
    expect(withChange((s) => (s.blog.readingTime = 'min read')).success).toBe(false);
    expect(withChange((s) => (s.blog.filterStatus.other = 'Showing articles')).success).toBe(false);
  });

  it('needs a 50–170 character description for the blog page', () => {
    expect(withChange((s) => (s.blog.seoDescription = 'Too short')).success).toBe(false);
  });

  it('only accepts an MP4 from the videos folder as the contact video', () => {
    expect(withChange((s) => (s.contact.video = '/video/new-loop.mp4')).success).toBe(true);
    expect(withChange((s) => (s.contact.video = 'https://example.com/a.mp4')).success).toBe(false);
    expect(withChange((s) => (s.contact.video = '/video/a.mov')).success).toBe(false);
  });

  it('survives lists being emptied: Pages CMS removes empty lists when it saves', () => {
    const r = schema.safeParse(
      (() => {
        const copy = structuredClone(sectionsFixture) as unknown as Record<
          string,
          Record<string, unknown>
        >;
        delete copy.subsidy?.handles;
        delete copy.why?.tiles;
        delete copy.engineering?.stats;
        return copy;
      })(),
    );
    expect(r.success).toBe(true);
    expect(r.data?.subsidy.handles).toEqual([]);
    expect(r.data?.why.tiles).toEqual([]);
    expect(r.data?.engineering.stats).toEqual([]);
  });
});
