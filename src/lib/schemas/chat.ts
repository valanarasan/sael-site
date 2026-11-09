import { z } from 'astro/zod';
import { linkSchema, tokenText } from './common';

/** Astro's reference('blog'): checks a slug points at a real article. Passed in for testability. */
export type BlogRefField = () => z.ZodType<{ collection: 'blog'; id: string }>;

const prefill = z.string().min(1).max(300);

/** Pages CMS stores a picked article as its file name ("om-amc.md"); the slug is what's needed. */
const withoutMarkdownExtension = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\.md$/, '') : value;

/**
 * One chat answer. The matcher (src/lib/chat) scores each intent by its keywords; the best match
 * answers. New answers are new entries here, not code changes.
 */
export const intentSchema = (blogRef: BlogRefField) =>
  z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'Lower-case letters, numbers and hyphens'),
    keywords: z.array(z.string().min(2).max(40).toLowerCase()).min(1),
    /** Plain text. May use {phone}, {email}, {whatsapp}, {offices} and {blog}. */
    answer: tokenText.max(600),
    /** Links shown under the answer, e.g. to a home-page section. */
    links: z.array(linkSchema).max(3).default([]),
    /** Blog articles shown as "Read: …" links. */
    related: z.array(z.preprocess(withoutMarkdownExtension, blogRef())).max(3).default([]),
    /** Message prefilled when the visitor taps "Continue on WhatsApp". No button when left out. */
    whatsapp: prefill.optional(),
  });

export const chipSchema = z.object({
  label: z.string().min(1).max(30),
  /** Sent as if the visitor typed it. Leave out to make the chip open WhatsApp instead. */
  message: z.string().min(1).max(120).optional(),
});

export const chatSchema = (blogRef: BlogRefField) =>
  z
    .object({
      title: z.string().min(1).max(40),
      subtitle: z.string().max(60),
      openLabel: z.string().min(1).max(30),
      greeting: tokenText.max(400),
      inputLabel: z.string().min(1).max(40),
      inputPlaceholder: z.string().max(40),
      note: z.string().max(200),
      whatsappLabel: z.string().min(1).max(40),
      closeLabel: z.string().min(1).max(30),
      sendLabel: z.string().min(1).max(20),
      chipsLabel: z.string().min(1).max(40),
      /** Prefix for related-article links, e.g. "Read:". */
      readLabel: z.string().min(1).max(20),
      /** Reply when nothing matches; always offers WhatsApp with the visitor's question. */
      fallback: z.object({ answer: tokenText.max(300), whatsapp: prefill }),
      /** Reply for chips with no message. */
      whatsappChip: z.object({
        answer: z.string().max(200),
        whatsapp: prefill,
        buttonLabel: z.string().max(30),
      }),
      /**
       * Size follow-up: after the subsidy intent, or when the visitor types e.g. "3 kW".
       * {kw} and {amount} are filled in by the chat code.
       */
      subsidyFollowUp: z.object({
        intentId: z.string(),
        answer: z.string().includes('{amount}'),
        capNote: z.string().max(200),
        confirm: z.string().max(200),
        whatsapp: prefill,
        buttonLabel: z.string().max(30),
      }),
      chips: z.array(chipSchema).min(1).max(10),
      intents: z.array(intentSchema(blogRef)).min(1),
    })
    .superRefine((chat, ctx) => {
      const ids = chat.intents.map((i) => i.id);
      ids.forEach((id, i) => {
        if (ids.indexOf(id) !== i) {
          ctx.addIssue({
            code: 'custom',
            path: ['intents', i, 'id'],
            message: `Duplicate intent ${id}`,
          });
        }
      });
      if (!ids.includes(chat.subsidyFollowUp.intentId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['subsidyFollowUp', 'intentId'],
          message: `No intent with id ${chat.subsidyFollowUp.intentId}`,
        });
      }
    });

export type ChatContent = z.infer<ReturnType<typeof chatSchema>>;
export type Intent = z.infer<ReturnType<typeof intentSchema>>;
