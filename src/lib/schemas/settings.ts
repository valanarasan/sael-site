import { z } from 'astro/zod';
import { linkSchema } from './common';

export { internalHref, linkSchema } from './common';

export const phoneSchema = z.object({
  /** How the number is shown, e.g. "+91 98807 03083". */
  display: z.string().min(6).max(24),
  /** International format used for tel: links, e.g. "+919880703083". */
  e164: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international format, e.g. +919880703083'),
});

export const officeSchema = z.object({
  name: z.string().min(1).max(40),
  address: z.string().min(1).max(200).optional(),
  phone: phoneSchema.optional(),
  email: z.email().optional(),
});

export const settingsSchema = z.object({
  /** Default page title and description (search results and link previews). */
  seo: z.object({
    title: z.string().min(1).max(70),
    description: z.string().min(50).max(170),
  }),
  company: z.object({
    name: z.string().min(1),
    legalName: z.string().min(1),
    tagline: z.string().min(1),
    summary: z.string().min(1).max(300),
  }),
  contact: z.object({
    phone: phoneSchema,
    /** Digits only, with country code, for wa.me links, e.g. "919880703083". */
    whatsapp: z
      .string()
      .regex(/^[1-9]\d{9,14}$/, 'Digits only with country code, e.g. 919880703083'),
    email: z.email(),
  }),
  offices: z.array(officeSchema).min(1),
  primaryCta: linkSchema,
  nav: z.object({
    header: z.array(linkSchema).min(1).max(7),
    menu: z.array(linkSchema).min(1).max(10),
  }),
  footer: z.object({
    columns: z
      .array(z.object({ title: z.string().min(1).max(30), links: z.array(linkSchema).min(1) }))
      .max(3),
    credits: z.string().max(600).optional(),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Phone = z.infer<typeof phoneSchema>;
export type Office = z.infer<typeof officeSchema>;
