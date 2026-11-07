import { describe, expect, it } from 'vitest';
import { buildRss, escapeXml } from '../../src/lib/rss';

const channel = {
  title: 'SAEL Blog',
  description: 'Solar, explained',
  link: 'https://example.com/blog',
  feedUrl: 'https://example.com/rss.xml',
  items: [],
};

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`O&M <AMC> "quoted" 'single'`)).toBe(
      'O&amp;M &lt;AMC&gt; &quot;quoted&quot; &apos;single&apos;',
    );
  });
});

describe('buildRss', () => {
  it('builds a valid empty channel with a self link and Indian English', () => {
    const xml = buildRss(channel);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<title>SAEL Blog</title>');
    expect(xml).toContain('<link>https://example.com/blog</link>');
    expect(xml).toContain(
      '<atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>',
    );
    expect(xml).toContain('<language>en-IN</language>');
    expect(xml).not.toContain('<item>');
    expect(xml).not.toContain('lastBuildDate');
  });

  it('lists items newest first with permalink guids and RFC 822 dates', () => {
    const xml = buildRss({
      ...channel,
      items: [
        {
          title: 'Old',
          link: 'https://example.com/blog/old',
          pubDate: new Date('2026-10-01T03:30:00Z'),
        },
        {
          title: 'O&M <new>',
          link: 'https://example.com/blog/new',
          pubDate: new Date('2026-11-05T03:30:00Z'),
          description: 'About AMC',
          category: 'O&M & AMC',
        },
      ],
    });
    expect(xml.indexOf('O&amp;M &lt;new&gt;')).toBeLessThan(xml.indexOf('<title>Old</title>'));
    expect(xml).toContain('<guid isPermaLink="true">https://example.com/blog/new</guid>');
    expect(xml).toContain('<pubDate>Thu, 05 Nov 2026 03:30:00 GMT</pubDate>');
    expect(xml).toContain('<lastBuildDate>Thu, 05 Nov 2026 03:30:00 GMT</lastBuildDate>');
    expect(xml).toContain('<description>About AMC</description>');
    expect(xml).toContain('<category>O&amp;M &amp; AMC</category>');
    // The item without a description or category has neither element.
    const old = xml.slice(xml.indexOf('<title>Old</title>'));
    expect(old.slice(0, old.indexOf('</item>'))).not.toMatch(/<description>|<category>/);
  });

  it('does not reorder the caller’s items', () => {
    const items = [
      { title: 'A', link: 'https://e.com/a', pubDate: new Date('2026-01-01') },
      { title: 'B', link: 'https://e.com/b', pubDate: new Date('2026-02-01') },
    ];
    buildRss({ ...channel, items });
    expect(items.map((i) => i.title)).toEqual(['A', 'B']);
  });

  it('uses the given language', () => {
    expect(buildRss({ ...channel, language: 'en-NZ' })).toContain('<language>en-NZ</language>');
  });
});
