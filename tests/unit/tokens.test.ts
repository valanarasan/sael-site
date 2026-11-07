import { describe, expect, it } from 'vitest';
import { fillTokens, segmentsToText } from '../../src/lib/text';
import { tokenValues } from '../../src/lib/view-models/tokens';
import { settingsFixture } from '../fixtures/settings';

describe('tokenValues', () => {
  const values = tokenValues(settingsFixture);

  it('links the main phone, email and WhatsApp from settings', () => {
    expect(values.phone).toEqual([
      { kind: 'link', text: '+91 90000 00001', href: 'tel:+919000000001' },
    ]);
    expect(values.email).toEqual([
      { kind: 'link', text: 'hello@example.com', href: 'mailto:hello@example.com' },
    ]);
    expect(values.whatsapp).toEqual([
      { kind: 'link', text: 'WhatsApp', href: 'https://wa.me/919000000002', external: true },
    ]);
  });

  it('lists offices with addresses and phone links, skipping what is missing', () => {
    expect(values.offices).toEqual([
      { kind: 'text', text: 'Head office: 1 Test Street, Testville 560001' },
      { kind: 'text', text: ', ' },
      { kind: 'link', text: '+91 90000 00003', href: 'tel:+919000000003' },
      { kind: 'text', text: '; ' },
      { kind: 'text', text: 'Overseas' },
    ]);
  });

  it('links the blog with a configurable label', () => {
    expect(values.blog).toEqual([{ kind: 'link', text: 'SAEL blog', href: '/blog' }]);
    expect(tokenValues(settingsFixture, 'our blog').blog?.[0]?.text).toBe('our blog');
  });

  it('fills the FAQ intro end to end', () => {
    const segments = fillTokens('Call {phone}, write to {email}, or read the {blog}.', values);
    expect(segmentsToText(segments)).toBe(
      'Call +91 90000 00001, write to hello@example.com, or read the SAEL blog.',
    );
    expect(segments.filter((s) => s.kind === 'link')).toHaveLength(3);
  });
});
