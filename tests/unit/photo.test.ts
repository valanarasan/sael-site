import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Photo from '../../src/components/ui/Photo.astro';
import { photoWidths } from '../../src/lib/photo';
import { fakeImage } from '../fixtures/content';

describe('photoWidths', () => {
  it('never goes above the original', () => {
    expect(photoWidths(1000)).toEqual([480, 800, 1000]);
  });

  it('stops at the maximum when one is given', () => {
    expect(photoWidths(4000, 1200)).toEqual([480, 800, 1200]);
  });

  it('ignores a maximum larger than the original', () => {
    expect(photoWidths(700, 1920)).toEqual([480, 700]);
  });

  it('keeps a small original as its only size', () => {
    expect(photoWidths(300)).toEqual([300]);
  });
});

describe('Photo loading hints', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const img = async (props: Record<string, unknown>) => {
    const html = await container.renderToString(Photo, {
      props: { src: fakeImage('roof'), alt: 'A roof', sizes: '100vw', ...props },
    });
    return html.match(/<img[^>]*>/)?.[0] ?? '';
  };

  it('is lazy by default, with no priority hint', async () => {
    const tag = await img({});
    expect(tag).toContain('loading="lazy"');
    expect(tag).toContain('fetchpriority="auto"');
  });

  it('loads the first hero image eagerly and first', async () => {
    const tag = await img({ priority: true });
    expect(tag).toContain('loading="eager"');
    expect(tag).toContain('fetchpriority="high"');
  });

  it('puts photos that only count as on screen behind the first one', async () => {
    const tag = await img({ lowPriority: true });
    expect(tag).toContain('loading="lazy"');
    expect(tag).toContain('fetchpriority="low"');
  });
});
