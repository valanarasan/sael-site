/**
 * Server-side validation of the enquiry form. Never trust the browser's checks: every field is
 * re-checked here. Interests and bill bands come from sections.json, so they are passed in.
 */
import { z } from 'astro/zod';
import { normaliseIndianMobile } from './phone';
import type { Lead } from './types';

export interface LeadOptions {
  /** Allowed "interest" values (sections.json → contact.form.interests). */
  interests: readonly string[];
  /** Allowed bill bands; when left out, any short text is accepted. */
  billOptions?: readonly string[];
}

/** Name of the hidden field bots fill in. Must match the form markup. */
export const HONEYPOT_FIELD = 'website';

export type LeadField = 'name' | 'phone' | 'interest' | 'district' | 'bill' | 'message' | 'consent';

export type LeadValidation =
  | { ok: true; lead: Lead }
  | { ok: false; reason: 'spam' }
  | { ok: false; reason: 'invalid'; errors: Partial<Record<LeadField | 'form', string>> };

export const MESSAGES = {
  name: 'Enter your name (letters only, 2 to 80 characters).',
  phone: 'Enter a 10-digit mobile number.',
  interest: "Choose what you're interested in.",
  district: 'Enter your district, or a 6-digit PIN code.',
  bill: 'Choose your monthly bill from the list.',
  message: 'Keep the message under 1,000 characters.',
  consent: 'Please agree to be contacted about your enquiry.',
  form: 'Something went wrong with the form. Please try again.',
} as const;

const squash = (s: string) => s.trim().replace(/\s+/g, ' ');

/** A trimmed string, or undefined when empty or missing. Non-strings fail. */
const optionalText = z
  .string()
  .optional()
  .transform((s) => (s === undefined ? undefined : squash(s) || undefined));

const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const PIN = /^[1-9]\d{5}$/;
const CONSENT_VALUES = new Set(['on', 'true', 'yes']);

function leadSchema(options: LeadOptions) {
  return z.object({
    name: z
      .string({ error: MESSAGES.name })
      .transform(squash)
      .pipe(z.string().min(2, MESSAGES.name).max(80, MESSAGES.name).regex(NAME, MESSAGES.name)),
    phone: z.string({ error: MESSAGES.phone }).transform((s, ctx) => {
      const phone = normaliseIndianMobile(s);
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: MESSAGES.phone });
        return z.NEVER;
      }
      return phone;
    }),
    interest: z
      .string({ error: MESSAGES.interest })
      .transform(squash)
      .refine((s) => options.interests.includes(s), MESSAGES.interest),
    district: optionalText.refine(
      (s) => s === undefined || (s.length <= 80 && (!/^\d+$/.test(s) || PIN.test(s))),
      MESSAGES.district,
    ),
    bill: optionalText.refine(
      (s) =>
        s === undefined || (options.billOptions ? options.billOptions.includes(s) : s.length <= 40),
      MESSAGES.bill,
    ),
    message: z
      .string({ error: MESSAGES.message })
      .optional()
      .transform((s) => (s === undefined ? undefined : s.trim() || undefined))
      .refine((s) => s === undefined || s.length <= 1000, MESSAGES.message),
    consent: z
      .union([z.literal(true), z.string()], { error: MESSAGES.consent })
      .refine((v) => v === true || CONSENT_VALUES.has(v.trim().toLowerCase()), MESSAGES.consent)
      .transform((): true => true),
  });
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validates raw form input (e.g. Object.fromEntries(formData)).
 * A filled honeypot is reported as spam before anything else is checked, so the endpoint can
 * reject it silently.
 */
export function validateLead(input: unknown, options: LeadOptions): LeadValidation {
  if (!isRecord(input)) return { ok: false, reason: 'invalid', errors: { form: MESSAGES.form } };

  const honeypot = input[HONEYPOT_FIELD];
  if (honeypot !== undefined && honeypot !== '') return { ok: false, reason: 'spam' };

  const result = leadSchema(options).safeParse(input);
  if (!result.success) {
    const errors: Partial<Record<LeadField | 'form', string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      const key = typeof field === 'string' && field in MESSAGES ? (field as LeadField) : 'form';
      errors[key] ??= MESSAGES[key];
    }
    return { ok: false, reason: 'invalid', errors };
  }

  const { name, phone, interest, district, bill, message } = result.data;
  return {
    ok: true,
    lead: {
      name,
      phone,
      interest,
      ...(district ? { district } : {}),
      ...(bill ? { bill } : {}),
      ...(message ? { message } : {}),
      consent: true,
    },
  };
}
