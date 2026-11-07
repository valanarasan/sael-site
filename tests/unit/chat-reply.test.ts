import { describe, expect, it } from 'vitest';
import { replyToChip, replyToText, type ChatContext, type ChatState } from '../../src/lib/chat';
import { segmentsToText } from '../../src/lib/text';
import { tokenValues } from '../../src/lib/view-models/tokens';
import { chatFixture } from '../fixtures/chat';
import { settingsFixture } from '../fixtures/settings';
import { specRules } from '../fixtures/subsidy';

const ctx: ChatContext = {
  chat: chatFixture,
  tokens: tokenValues(settingsFixture),
  whatsappNumber: '919000000002',
  subsidyRules: specRules,
  posts: {
    'pm-surya-ghar': { title: 'What is PM Surya Ghar?', href: '/blog/pm-surya-ghar' },
    types: { title: 'Types of plants', href: '/blog#types' },
  },
};
const fresh: ChatState = { expectingSize: false };
const text = (r: { segments: Parameters<typeof segmentsToText>[0] }) => segmentsToText(r.segments);
const decode = (href: string) => decodeURIComponent(href.split('?text=')[1] ?? '');

describe('replyToText: intents', () => {
  it('answers with the intent text, links, related posts and WhatsApp button', () => {
    const { reply, state } = replyToText('Which system is best?', fresh, ctx);
    expect(reply.kind).toBe('intent');
    expect(reply.intentId).toBe('which');
    expect(text(reply)).toBe('On-grid, hybrid or off-grid.');
    expect(reply.links).toEqual([{ label: 'Compare systems', href: '/#systems' }]);
    // The missing related post is skipped rather than linked to a 404.
    expect(reply.reads).toEqual([{ title: 'Types of plants', href: '/blog#types' }]);
    expect(reply).not.toHaveProperty('whatsapp');
    expect(state.expectingSize).toBe(false);
  });

  it('adds a WhatsApp button with the intent prefill', () => {
    const { reply } = replyToText('borewell pump', fresh, ctx);
    expect(reply.whatsapp).toEqual({
      label: 'Continue on WhatsApp',
      href: 'https://wa.me/919000000002?text=Hi%2C%20a%20pump%20please.',
    });
  });

  it('fills contact tokens from settings', () => {
    const { reply } = replyToText('What is your phone number?', fresh, ctx);
    expect(text(reply)).toBe('Call +91 90000 00001.');
    expect(reply.segments).toContainEqual({
      kind: 'link',
      text: '+91 90000 00001',
      href: 'tel:+919000000001',
    });
  });

  it('answers removed products politely', () => {
    const { reply } = replyToText('Do you do solar water heaters?', fresh, ctx);
    expect(reply.intentId).toBe('not-offered');
    expect(text(reply)).toMatch(/don't supply/);
  });
});

describe('replyToText: subsidy follow-up', () => {
  it('asks for a size after the subsidy intent, then works it out', () => {
    const first = replyToText('How much subsidy?', fresh, ctx);
    expect(first.reply.intentId).toBe('subsidy');
    expect(first.reply.reads).toEqual([
      { title: 'What is PM Surya Ghar?', href: '/blog/pm-surya-ghar' },
    ]);
    expect(first.state.expectingSize).toBe(true);

    const second = replyToText('3', first.state, ctx);
    expect(second.reply.kind).toBe('subsidy');
    expect(text(second.reply)).toBe(
      'For a 3 kW system the central subsidy is about ₹78,000. We confirm it at the survey.',
    );
    expect(second.reply.whatsapp?.label).toBe('Check on WhatsApp');
    expect(decode(second.reply.whatsapp?.href ?? '')).toBe('Hi, I am looking at 3 kW.');
    expect(second.state.expectingSize).toBe(false);
  });

  it('works out a size given with "kW" at any time', () => {
    const { reply } = replyToText('what about 2 kW?', fresh, ctx);
    expect(text(reply)).toContain('₹60,000');
    expect(text(reply)).not.toContain('capped');
  });

  it('mentions the cap above 3 kW', () => {
    const { reply } = replyToText('8 kW', fresh, ctx);
    expect(text(reply)).toBe(
      'For a 8 kW system the central subsidy is about ₹78,000. It is capped at 3 kW. We confirm it at the survey.',
    );
  });

  it('stops expecting a size after any other answer', () => {
    const asked = replyToText('subsidy', fresh, ctx).state;
    const other = replyToText('I need a pump', asked, ctx);
    expect(other.state.expectingSize).toBe(false);
    expect(replyToText('3', other.state, ctx).reply.kind).toBe('fallback');
  });
});

describe('replyToText: fallback', () => {
  it('offers WhatsApp with the visitor question for unknown text', () => {
    const { reply } = replyToText('Can you fix my car?', fresh, ctx);
    expect(reply.kind).toBe('fallback');
    expect(text(reply)).toBe('Not sure about that one.');
    expect(reply.whatsapp?.label).toBe('Continue on WhatsApp');
    expect(decode(reply.whatsapp?.href ?? '')).toBe('Hi, I have a question: Can you fix my car?');
  });

  it('trims a very long question in the WhatsApp message', () => {
    const long = 'x'.repeat(500);
    const { reply } = replyToText(long, fresh, ctx);
    expect(decode(reply.whatsapp?.href ?? '').length).toBeLessThanOrEqual(
      'Hi, I have a question: '.length + 201,
    );
  });

  it('returns no reply for empty input', () => {
    expect(replyToText('   ', fresh, ctx).reply.kind).toBe('none');
  });
});

describe('replyToChip', () => {
  it('sends a chip message as if typed', () => {
    const { reply } = replyToChip(
      { label: 'Subsidy', message: 'How much subsidy can I get?' },
      fresh,
      ctx,
    );
    expect(reply.intentId).toBe('subsidy');
  });

  it('opens WhatsApp for a chip with no message', () => {
    const { reply, state } = replyToChip({ label: 'WhatsApp' }, { expectingSize: true }, ctx);
    expect(reply.kind).toBe('whatsapp');
    expect(text(reply)).toBe('Tap below.');
    expect(reply.whatsapp).toEqual({
      label: 'Open WhatsApp',
      href: 'https://wa.me/919000000002?text=Hi%2C%20let%20us%20talk.',
    });
    expect(state.expectingSize).toBe(false);
  });
});
