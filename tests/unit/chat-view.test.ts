import { describe, expect, it } from 'vitest';
import { chatPostLink, toChatData } from '../../src/lib/view-models/chat';
import { chatFixture } from '../fixtures/chat';
import { postsFixture } from '../fixtures/content';
import { settingsFixture } from '../fixtures/settings';
import { specRules } from '../fixtures/subsidy';

const post = (id: string) => {
  const p = postsFixture.find((x) => x.id === id);
  if (!p) throw new Error(`fixture ${id} missing`);
  return p;
};

describe('chatPostLink', () => {
  it('links a published post to its page', () => {
    expect(chatPostLink(post('new-post'))).toEqual({
      title: 'Title of new-post',
      href: '/blog/new-post',
    });
  });

  it('links a draft to its coming-soon card on the blog page', () => {
    expect(chatPostLink(post('draft-perf'))).toEqual({
      title: 'Title of draft-perf',
      href: '/blog#draft-perf',
    });
  });
});

describe('toChatData', () => {
  const data = toChatData({
    chat: chatFixture,
    settings: settingsFixture,
    rules: specRules,
    posts: postsFixture,
  });

  it('carries only what the browser needs', () => {
    expect(Object.keys(data.chat).sort()).toEqual([
      'fallback',
      'intents',
      'subsidyFollowUp',
      'whatsappChip',
      'whatsappLabel',
    ]);
    expect(data.whatsappNumber).toBe('919000000002');
    expect(data.subsidyRules).toBe(specRules);
  });

  it('maps every post by slug', () => {
    expect(Object.keys(data.posts).sort()).toEqual(postsFixture.map((p) => p.id).sort());
  });

  it('fills tokens in the greeting', () => {
    expect(data.greeting).toContainEqual({
      kind: 'link',
      text: '+91 90000 00001',
      href: 'tel:+919000000001',
    });
  });

  it('is plain JSON', () => {
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});
