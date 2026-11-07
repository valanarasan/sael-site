/**
 * Builds everything the chat assistant needs in the browser, served as /chat-data.json and
 * fetched only when someone opens the chat.
 */
import type { ChatContext } from '../chat';
import type { ChatContent } from '../schemas/chat';
import type { Settings } from '../schemas/settings';
import type { SubsidyRules } from '../schemas/subsidy';
import { fillTokens, type Segment } from '../text';
import { postHref, type BlogEntry } from './blog';
import { tokenValues } from './tokens';

export interface ChatData extends ChatContext {
  greeting: Segment[];
}

/**
 * Link for an article an answer mentions. Drafts have no page yet, so they point at their
 * "coming soon" card on the blog page.
 */
export function chatPostLink({ id, data }: BlogEntry): { title: string; href: string } {
  return { title: data.title, href: data.draft ? `/blog#${id}` : postHref(id) };
}

export function toChatData(input: {
  chat: ChatContent;
  settings: Settings;
  rules: SubsidyRules;
  posts: BlogEntry[];
}): ChatData {
  const { chat, settings, rules, posts } = input;
  const tokens = tokenValues(settings);
  return {
    chat: {
      intents: chat.intents,
      fallback: chat.fallback,
      whatsappChip: chat.whatsappChip,
      subsidyFollowUp: chat.subsidyFollowUp,
      whatsappLabel: chat.whatsappLabel,
    },
    tokens,
    whatsappNumber: settings.contact.whatsapp,
    subsidyRules: rules,
    posts: Object.fromEntries(posts.map((p) => [p.id, chatPostLink(p)])),
    greeting: fillTokens(chat.greeting, tokens),
  };
}
