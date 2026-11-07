import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';

/**
 * Astro's image() schema helper. Passed in (rather than imported from astro:content) so these
 * schemas can be unit-tested with a stub.
 */
export type ImageField = () => z.ZodType<ImageMetadata>;

/** A link to a page or a section on the home page: "/blog", "/#contact", "#faq". */
export const internalHref = z
  .string()
  .regex(/^(\/|#)[\w\-/#]*$/, 'Use a site path like "/blog" or a section link like "/#contact"');

export const linkSchema = z.object({
  label: z.string().min(1).max(40),
  href: internalHref,
});

/**
 * Text that may wrap words in *asterisks* for the serif italic accent, e.g. "Up to *₹78,000* back".
 * Asterisks must come in pairs.
 */
export const accentText = z
  .string()
  .min(1)
  .refine((s) => (s.match(/\*/g) ?? []).length % 2 === 0, {
    message: 'Asterisks mark the italic accent and must come in pairs, e.g. "all *around* us"',
  });

/**
 * Tokens that text can use to pull contact details from settings.json, so a number is never typed
 * twice: {phone}, {email}, {whatsapp}, {offices}, {blog}.
 */
export const TEXT_TOKENS = ['phone', 'email', 'whatsapp', 'offices', 'blog'] as const;
export type TextToken = (typeof TEXT_TOKENS)[number];

export const tokenText = z
  .string()
  .min(1)
  .refine(
    (s) =>
      [...s.matchAll(/\{(\w+)\}/g)].every(([, t]) =>
        (TEXT_TOKENS as readonly string[]).includes(t ?? ''),
      ),
    {
      message: `Only these {tokens} are allowed: ${TEXT_TOKENS.map((t) => `{${t}}`).join(', ')}`,
    },
  );

/** An image with its alt text. Alt text is required: it describes the photo for screen readers. */
export const photo = (image: ImageField) =>
  z.object({
    image: image(),
    alt: z.string().min(3).max(200),
  });

/**
 * A figure SAEL still has to supply. `placeholder: true` keeps it visibly marked
 * ("Figure from SAEL") on the page until real content arrives.
 */
export const statSchema = z.object({
  value: z.string().min(1).max(20),
  label: z.string().min(1).max(60),
  placeholder: z.boolean().default(false),
});
