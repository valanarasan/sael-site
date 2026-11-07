import { describe, expect, it } from 'vitest';
import { blogSchema } from '../../src/lib/schemas/blog';
import { chatSchema } from '../../src/lib/schemas/chat';
import { accentText, tokenText } from '../../src/lib/schemas/common';
import { faqSchema } from '../../src/lib/schemas/faqs';
import { projectSchema } from '../../src/lib/schemas/projects';
import { subsidySchema } from '../../src/lib/schemas/subsidy';
import { blogRefStub, fakeImage, imageStub, subsidyFixture } from '../fixtures/content';

const ok = (r: { success: boolean }) => expect(r.success).toBe(true);
const fails = (
  r: { success: boolean; error?: { issues: { message: string }[] } },
  msg?: RegExp,
) => {
  expect(r.success).toBe(false);
  if (msg) expect(r.error?.issues.map((i) => i.message).join(' | ')).toMatch(msg);
};

describe('accentText', () => {
  it('accepts paired asterisks', () => ok(accentText.safeParse('all *around* us')));
  it('accepts text with no accent', () => ok(accentText.safeParse('Energy is')));
  it('rejects an unpaired asterisk', () => fails(accentText.safeParse('all *around us'), /pairs/));
});

describe('tokenText', () => {
  it('accepts the known tokens', () =>
    ok(tokenText.safeParse('Call {phone} or {email}, see {blog}')));
  it('rejects an unknown token', () => fails(tokenText.safeParse('Call {mobile}'), /\{phone\}/));
});

describe('subsidySchema', () => {
  it('accepts valid rules', () => ok(subsidySchema.safeParse(subsidyFixture)));

  it('rejects slabs with a gap', () => {
    const rules = structuredClone(subsidyFixture);
    rules.central.slabs[1] = { fromKw: 2.5, toKw: 3, perKw: 10000 };
    fails(subsidySchema.safeParse(rules), /start at 2 kW/);
  });

  it('rejects a slab that ends before it starts', () => {
    const rules = structuredClone(subsidyFixture);
    rules.central.slabs[0] = { fromKw: 0, toKw: 0, perKw: 1 };
    fails(subsidySchema.safeParse(rules));
  });

  it('rejects duplicate states', () => {
    const rules = structuredClone(subsidyFixture);
    rules.states.push({ id: 'BB', name: 'Beta again' });
    fails(subsidySchema.safeParse(rules), /Duplicate state BB/);
  });

  it('requires the fallback and default states to exist', () => {
    fails(
      subsidySchema.safeParse({ ...subsidyFixture, fallbackStateId: 'QQ' }),
      /QQ is not in the states list/,
    );
    fails(subsidySchema.safeParse({ ...subsidyFixture, defaultStateId: 'QQ' }), /QQ/);
  });

  it('rejects a cap on a note-only state', () => {
    const rules = structuredClone(subsidyFixture);
    rules.states[0] = { id: 'AA', name: 'Alpha', cap: 1000 };
    fails(subsidySchema.safeParse(rules), /only apply when perKw is set/);
  });

  it('rejects a lower-case or long state id', () => {
    const rules = structuredClone(subsidyFixture);
    rules.states[0] = { id: 'ka', name: 'Karnataka' };
    fails(subsidySchema.safeParse(rules));
  });

  it('rejects negative or fractional rupees', () => {
    const rules = structuredClone(subsidyFixture);
    rules.central.cap = -1;
    fails(subsidySchema.safeParse(rules));
    rules.central.cap = 100.5;
    fails(subsidySchema.safeParse(rules));
  });
});

describe('faqSchema', () => {
  it('accepts a question and answer', () =>
    ok(faqSchema.safeParse({ question: 'Is it safe?', answer: 'Yes, it is very safe.' })));
  it('rejects an empty answer', () =>
    fails(faqSchema.safeParse({ question: 'Is it safe?', answer: '' })));
});

describe('projectSchema', () => {
  const schema = projectSchema(imageStub);
  const base = { title: 'A project', kind: 'solar', layout: 'card' };

  it('accepts a project with no photo and fills defaults', () => {
    const r = schema.safeParse(base);
    ok(r);
    expect(r.data).toMatchObject({ order: 100, draft: false });
  });

  it('requires alt text when there is a photo', () => {
    fails(schema.safeParse({ ...base, image: fakeImage('p') }), /alt text/);
    ok(schema.safeParse({ ...base, image: fakeImage('p'), alt: 'A rooftop array' }));
  });

  it('rejects an unknown layout', () => fails(schema.safeParse({ ...base, layout: 'huge' })));
});

describe('blogSchema', () => {
  const schema = blogSchema(imageStub);
  const draft = {
    title: 'What is PM Surya Ghar?',
    topic: 'Subsidy & schemes',
    cover: fakeImage('c'),
    coverAlt: 'A rooftop array',
  };

  it('treats posts as drafts by default and needs no date or description', () => {
    const r = schema.safeParse(draft);
    ok(r);
    expect(r.data?.draft).toBe(true);
  });

  it('needs a description and publish date to publish', () => {
    fails(schema.safeParse({ ...draft, draft: false }), /description.*\|.*publish date/);
  });

  it('accepts a complete published post and coerces date strings', () => {
    const r = schema.safeParse({
      ...draft,
      draft: false,
      description: 'A plain-language guide to the central rooftop solar subsidy for homes.',
      publishDate: '2026-11-05',
    });
    ok(r);
    expect(r.data?.publishDate).toBeInstanceOf(Date);
  });

  it('rejects an updated date before the publish date', () => {
    fails(
      schema.safeParse({
        ...draft,
        draft: false,
        description: 'A plain-language guide to the central rooftop solar subsidy for homes.',
        publishDate: '2026-11-05',
        updatedDate: '2026-11-01',
      }),
      /updated date/,
    );
  });

  it('rejects a topic that is not in the list', () =>
    fails(schema.safeParse({ ...draft, topic: 'Gossip' })));
  it('requires cover alt text', () => fails(schema.safeParse({ ...draft, coverAlt: '' })));
});

describe('chatSchema', () => {
  const schema = chatSchema(blogRefStub);
  const valid = {
    title: 'Assistant',
    subtitle: 'Replies on WhatsApp',
    openLabel: 'Ask',
    greeting: 'Hi!',
    inputLabel: 'Your question',
    inputPlaceholder: 'Type…',
    note: 'General answers.',
    whatsappLabel: 'Continue on WhatsApp',
    closeLabel: 'Close chat',
    sendLabel: 'Send',
    chipsLabel: 'Suggested questions',
    readLabel: 'Read:',
    fallback: { answer: 'Not sure.', whatsapp: 'Hi, {question}' },
    whatsappChip: { answer: 'Tap below.', whatsapp: 'Hi', buttonLabel: 'Open' },
    subsidyFollowUp: {
      intentId: 'subsidy',
      answer: 'For {kw} kW it is {amount}.',
      capNote: 'Capped.',
      confirm: 'We confirm it.',
      whatsapp: 'Hi, {kw} kW',
      buttonLabel: 'Check',
    },
    chips: [{ label: 'Subsidy', message: 'How much subsidy?' }, { label: 'WhatsApp' }],
    intents: [
      {
        id: 'subsidy',
        keywords: ['Subsidy', 'yojana'],
        answer: 'Up to the cap.',
        related: ['pm-surya-ghar'],
      },
      { id: 'contact', keywords: ['phone'], answer: 'Call {phone}.' },
    ],
  };

  it('accepts valid chat content, lower-cases keywords and resolves references', () => {
    const r = schema.safeParse(valid);
    ok(r);
    expect(r.data?.intents[0]?.keywords).toEqual(['subsidy', 'yojana']);
    expect(r.data?.intents[0]?.related).toEqual([{ collection: 'blog', id: 'pm-surya-ghar' }]);
    expect(r.data?.intents[1]?.links).toEqual([]);
  });

  it('rejects duplicate intent ids', () => {
    const bad = structuredClone(valid);
    bad.intents.push({ id: 'contact', keywords: ['email'], answer: 'Write to {email}.' });
    fails(schema.safeParse(bad), /Duplicate intent contact/);
  });

  it('requires the subsidy follow-up to point at a real intent', () => {
    const bad = structuredClone(valid);
    bad.subsidyFollowUp.intentId = 'missing';
    fails(schema.safeParse(bad), /No intent with id missing/);
  });

  it('requires {amount} in the subsidy follow-up', () => {
    const bad = structuredClone(valid);
    bad.subsidyFollowUp.answer = 'For {kw} kW it is a lot.';
    fails(schema.safeParse(bad));
  });

  it('rejects unknown tokens in answers', () => {
    const bad = structuredClone(valid);
    bad.intents[1] = { id: 'contact', keywords: ['phone'], answer: 'Call {mobile}.' };
    fails(schema.safeParse(bad), /Only these \{tokens\}/);
  });

  it('rejects an external link in an answer', () => {
    const bad = structuredClone(valid);
    Object.assign(bad.intents[1] ?? {}, {
      links: [{ label: 'Elsewhere', href: 'https://example.com' }],
    });
    fails(schema.safeParse(bad));
  });

  it('rejects an intent id with spaces or capitals', () => {
    const bad = structuredClone(valid);
    Object.assign(bad.intents[1] ?? {}, { id: 'Contact Us' });
    fails(schema.safeParse(bad));
  });
});
