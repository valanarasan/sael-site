/**
 * Builds the assistant's reply to a message. Pure: the chat island renders the result and keeps
 * the returned state for the next message.
 */
import { whatsappHref } from '../contact';
import { formatInr } from '../format';
import type { ChatContent } from '../schemas/chat';
import type { SubsidyRules } from '../schemas/subsidy';
import { calculateSubsidy } from '../subsidy';
import { fillTokens, type Segment, type TokenValues } from '../text';
import { matchIntent } from './match';
import { extractKw } from './size';

export interface ChatState {
  /** True right after the subsidy answer asked for a size, so a bare "3" means 3 kW. */
  expectingSize: boolean;
}

export const initialChatState: ChatState = { expectingSize: false };

export interface ChatContext {
  chat: Pick<
    ChatContent,
    'intents' | 'fallback' | 'whatsappChip' | 'subsidyFollowUp' | 'whatsappLabel'
  >;
  tokens: TokenValues;
  /** Digits with country code, from settings.json. */
  whatsappNumber: string;
  subsidyRules: SubsidyRules;
  /** Title and URL for each blog slug an answer may link to. */
  posts: Record<string, { title: string; href: string }>;
}

export interface ChatReply {
  kind: 'intent' | 'subsidy' | 'fallback' | 'whatsapp' | 'none';
  intentId?: string;
  segments: Segment[];
  links: { label: string; href: string }[];
  reads: { title: string; href: string }[];
  whatsapp?: { label: string; href: string };
}

export interface ChatTurn {
  reply: ChatReply;
  state: ChatState;
}

const MAX_QUOTED_QUESTION = 200;

const plain = (text: string): Segment[] => [{ kind: 'text', text }];

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);

const quote = (question: string) =>
  question.length > MAX_QUOTED_QUESTION ? `${question.slice(0, MAX_QUOTED_QUESTION)}…` : question;

function subsidyReply(kw: number, ctx: ChatContext): ChatReply {
  const { subsidyFollowUp: f } = ctx.chat;
  const rules = ctx.subsidyRules;
  const { central } = calculateSubsidy(kw, rules.fallbackStateId, rules);
  const cappedAbove = rules.central.slabs.at(-1)?.toKw ?? Infinity;
  const values = { kw: String(kw), amount: formatInr(central) };
  const sentences = [fill(f.answer, values), kw > cappedAbove ? f.capNote : '', f.confirm];
  return {
    kind: 'subsidy',
    segments: plain(sentences.filter(Boolean).join(' ')),
    links: [],
    reads: [],
    whatsapp: {
      label: f.buttonLabel,
      href: whatsappHref(ctx.whatsappNumber, fill(f.whatsapp, values)),
    },
  };
}

const NONE: ChatTurn = {
  reply: { kind: 'none', segments: [], links: [], reads: [] },
  state: initialChatState,
};

export function replyToText(text: string, state: ChatState, ctx: ChatContext): ChatTurn {
  const question = text.trim();
  if (!question) return NONE;

  const kw = extractKw(question, state.expectingSize);
  if (kw !== null) return { reply: subsidyReply(kw, ctx), state: { expectingSize: false } };

  const intent = matchIntent(question, ctx.chat.intents);
  if (!intent) {
    const { fallback } = ctx.chat;
    return {
      reply: {
        kind: 'fallback',
        segments: fillTokens(fallback.answer, ctx.tokens),
        links: [],
        reads: [],
        whatsapp: {
          label: ctx.chat.whatsappLabel,
          href: whatsappHref(
            ctx.whatsappNumber,
            fill(fallback.whatsapp, { question: quote(question) }),
          ),
        },
      },
      state: { expectingSize: false },
    };
  }

  const reads = intent.related.flatMap((ref) => {
    const post = ctx.posts[ref.id];
    return post ? [post] : [];
  });

  return {
    reply: {
      kind: 'intent',
      intentId: intent.id,
      segments: fillTokens(intent.answer, ctx.tokens),
      links: intent.links,
      reads,
      ...(intent.whatsapp
        ? {
            whatsapp: {
              label: ctx.chat.whatsappLabel,
              href: whatsappHref(ctx.whatsappNumber, intent.whatsapp),
            },
          }
        : {}),
    },
    state: { expectingSize: intent.id === ctx.chat.subsidyFollowUp.intentId },
  };
}

export function replyToChip(
  chip: { label: string; message?: string | undefined },
  state: ChatState,
  ctx: ChatContext,
): ChatTurn {
  if (chip.message) return replyToText(chip.message, state, ctx);
  const { whatsappChip } = ctx.chat;
  return {
    reply: {
      kind: 'whatsapp',
      segments: plain(whatsappChip.answer),
      links: [],
      reads: [],
      whatsapp: {
        label: whatsappChip.buttonLabel,
        href: whatsappHref(ctx.whatsappNumber, whatsappChip.whatsapp),
      },
    },
    state: { expectingSize: false },
  };
}
