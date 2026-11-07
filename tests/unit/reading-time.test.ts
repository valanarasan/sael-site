import { describe, expect, it } from 'vitest';
import { countWords, readingMinutes } from '../../src/lib/reading-time';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

describe('countWords', () => {
  it('counts plain words', () => {
    expect(countWords('Solar works on cloudy days too.')).toBe(6);
  });

  it('ignores Markdown symbols, headings and list markers', () => {
    expect(countWords('## Heading here\n\n- one\n- **two**\n\n> quote')).toBe(5);
  });

  it('keeps link text but drops link targets, images, code and HTML', () => {
    const md = [
      'See the [subsidy calculator](https://example.com/very/long/url).',
      '![A roof](./roof.jpg)',
      '```\nconst a = 1;\n```',
      '<!-- note to editor -->',
      '<span>Hi</span>',
    ].join('\n');
    expect(countWords(md)).toBe(5);
  });

  it('skips front matter when given a whole file', () => {
    expect(countWords("---\ntitle: 'A long title here'\n---\nTwo words")).toBe(2);
  });

  it('does not count stray punctuation as words', () => {
    expect(countWords('A — B · C')).toBe(3);
  });
});

describe('readingMinutes', () => {
  it('is at least one minute, even for an empty body', () => {
    expect(readingMinutes('')).toBe(1);
  });

  it('rounds up at 200 words a minute', () => {
    expect(readingMinutes(words(200))).toBe(1);
    expect(readingMinutes(words(201))).toBe(2);
    expect(readingMinutes(words(1000))).toBe(5);
  });
});
