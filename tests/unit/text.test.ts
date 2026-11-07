import { describe, expect, it } from 'vitest';
import {
  fillPlain,
  fillTokens,
  parseAccent,
  segmentsToText,
  type Segment,
} from '../../src/lib/text';

describe('parseAccent', () => {
  it('splits plain and accent text', () => {
    expect(parseAccent('Up to *₹78,000* back')).toEqual([
      { kind: 'text', text: 'Up to ' },
      { kind: 'accent', text: '₹78,000' },
      { kind: 'text', text: ' back' },
    ]);
  });

  it('handles an accent at the start or end', () => {
    expect(parseAccent('*Lower bills* out.')).toEqual([
      { kind: 'accent', text: 'Lower bills' },
      { kind: 'text', text: ' out.' },
    ]);
    expect(parseAccent('On-grid, off-grid *or hybrid?*')).toEqual([
      { kind: 'text', text: 'On-grid, off-grid ' },
      { kind: 'accent', text: 'or hybrid?' },
    ]);
  });

  it('supports more than one accent', () => {
    expect(parseAccent('*a* and *b*').map((s) => s.kind)).toEqual(['accent', 'text', 'accent']);
  });

  it('returns plain text when there is no accent', () => {
    expect(parseAccent('Energy is')).toEqual([{ kind: 'text', text: 'Energy is' }]);
  });

  it('keeps an unpaired asterisk as plain text instead of guessing', () => {
    expect(parseAccent('5* service')).toEqual([{ kind: 'text', text: '5* service' }]);
  });
});

describe('fillTokens', () => {
  const phone: Segment[] = [{ kind: 'link', text: '+91 90000 00001', href: 'tel:+919000000001' }];
  const email: Segment[] = [{ kind: 'link', text: 'a@example.com', href: 'mailto:a@example.com' }];

  it('replaces tokens with their segments', () => {
    expect(fillTokens('Call {phone} or write to {email}.', { phone, email })).toEqual([
      { kind: 'text', text: 'Call ' },
      phone[0],
      { kind: 'text', text: ' or write to ' },
      email[0],
      { kind: 'text', text: '.' },
    ]);
  });

  it('merges text tokens into the surrounding text', () => {
    const offices: Segment[] = [{ kind: 'text', text: 'Bangalore' }];
    expect(fillTokens('Our office: {offices}.', { offices })).toEqual([
      { kind: 'text', text: 'Our office: Bangalore.' },
    ]);
  });

  it('leaves a token with no value as written, so the gap is visible', () => {
    expect(fillTokens('Call {phone}', {})).toEqual([{ kind: 'text', text: 'Call {phone}' }]);
    expect(fillTokens('See {nope}', { phone })).toEqual([{ kind: 'text', text: 'See {nope}' }]);
  });

  it('returns the text unchanged when there are no tokens', () => {
    expect(fillTokens('Hello', { phone })).toEqual([{ kind: 'text', text: 'Hello' }]);
    expect(fillTokens('', { phone })).toEqual([]);
  });

  it('does not share segment objects with the input', () => {
    const [link] = fillTokens('{phone}', { phone });
    expect(link).toEqual(phone[0]);
    expect(link).not.toBe(phone[0]);
  });
});

describe('segmentsToText', () => {
  it('joins the visible text', () => {
    expect(segmentsToText(parseAccent('all *around* us.'))).toBe('all around us.');
  });
});

describe('fillPlain', () => {
  it('fills named placeholders with strings and numbers', () => {
    expect(fillPlain('{minutes} min read', { minutes: 4 })).toBe('4 min read');
    expect(fillPlain('Hi, I read "{title}"', { title: 'Zero bill' })).toBe(
      'Hi, I read "Zero bill"',
    );
  });

  it('leaves unknown placeholders as written', () => {
    expect(fillPlain('{count} of {total}', { count: 2 })).toBe('2 of {total}');
  });
});
