/**
 * Reads the enquiry settings from environment variables (see .env.example) and decides which
 * driver runs. A missing secret never silently drops leads: the endpoint answers "unavailable"
 * and names the missing settings in the server log (names only, never values).
 */
import { z } from 'astro/zod';

export const ENV_KEYS = [
  'LEADS_DRIVER',
  'TURNSTILE_SECRET_KEY',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'LEADS_SHEET_ID',
  'LEADS_SHEET_TAB',
  'LEADS_SHEET_GID',
  'RESEND_API_KEY',
  'LEADS_EMAIL_FROM',
  'LEADS_EMAIL_TO',
  'ENQUIRY_RATE_LIMIT_MAX',
  'ENQUIRY_RATE_LIMIT_WINDOW_SECONDS',
] as const;

export type LeadsEnv = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

export interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

export type LeadsConfig =
  | { driver: 'memory'; rateLimit: RateLimitConfig }
  | {
      driver: 'live';
      rateLimit: RateLimitConfig;
      turnstileSecret: string;
      sheet: {
        serviceAccountEmail: string;
        privateKey: string;
        id: string;
        tab: string;
        gid: string;
      };
      email: { apiKey: string; from: string; to: string[] };
    }
  | { driver: 'unconfigured'; problems: string[] };

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const required = z.preprocess(blank, z.string().trim().min(1));
const optional = (fallback: string) => z.preprocess(blank, z.string().trim().default(fallback));
const positiveInt = (fallback: number) =>
  z.preprocess(blank, z.coerce.number().int().positive().default(fallback));

const rateLimitSchema = z.object({
  ENQUIRY_RATE_LIMIT_MAX: positiveInt(5),
  ENQUIRY_RATE_LIMIT_WINDOW_SECONDS: positiveInt(600),
});

const liveSchema = rateLimitSchema.extend({
  TURNSTILE_SECRET_KEY: required,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.preprocess(blank, z.email()),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: required.refine((k) => k.includes('PRIVATE KEY'), {
    message: 'should be a PEM private key',
  }),
  LEADS_SHEET_ID: required,
  LEADS_SHEET_TAB: optional('Leads'),
  LEADS_SHEET_GID: optional('0'),
  RESEND_API_KEY: required,
  LEADS_EMAIL_FROM: required,
  LEADS_EMAIL_TO: z.preprocess(
    (v) =>
      typeof v === 'string'
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : v,
    z.array(z.email()).min(1),
  ),
});

const problemsOf = (error: z.ZodError) =>
  [...new Set(error.issues.map((i) => `${String(i.path[0])}: ${i.message}`))].sort();

export function readLeadsConfig(env: LeadsEnv): LeadsConfig {
  const driver = (env.LEADS_DRIVER ?? '').trim() || 'live';

  if (driver === 'memory') {
    const parsed = rateLimitSchema.safeParse(env);
    if (!parsed.success) return { driver: 'unconfigured', problems: problemsOf(parsed.error) };
    return {
      driver: 'memory',
      rateLimit: {
        max: parsed.data.ENQUIRY_RATE_LIMIT_MAX,
        windowSeconds: parsed.data.ENQUIRY_RATE_LIMIT_WINDOW_SECONDS,
      },
    };
  }
  if (driver !== 'live')
    return { driver: 'unconfigured', problems: ['LEADS_DRIVER: use "live" or "memory"'] };

  const parsed = liveSchema.safeParse(env);
  if (!parsed.success) return { driver: 'unconfigured', problems: problemsOf(parsed.error) };
  const e = parsed.data;
  return {
    driver: 'live',
    rateLimit: {
      max: e.ENQUIRY_RATE_LIMIT_MAX,
      windowSeconds: e.ENQUIRY_RATE_LIMIT_WINDOW_SECONDS,
    },
    turnstileSecret: e.TURNSTILE_SECRET_KEY,
    sheet: {
      serviceAccountEmail: e.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      id: e.LEADS_SHEET_ID,
      tab: e.LEADS_SHEET_TAB,
      gid: e.LEADS_SHEET_GID,
    },
    email: { apiKey: e.RESEND_API_KEY, from: e.LEADS_EMAIL_FROM, to: e.LEADS_EMAIL_TO },
  };
}
