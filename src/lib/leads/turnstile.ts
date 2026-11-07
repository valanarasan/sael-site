/** Cloudflare Turnstile server-side check (https://developers.cloudflare.com/turnstile/). */
import { z } from 'astro/zod';
import type { SpamCheck } from './types';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Name of the hidden field the Turnstile widget adds to the form. */
export const TURNSTILE_FIELD = 'cf-turnstile-response';

const responseSchema = z.object({ success: z.boolean() });

export interface TurnstileOptions {
  secret: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Fails closed: a missing token, a "no" from Cloudflare or an unreachable Cloudflare all count
 * as not verified. The visitor is asked to try again (or call), so a real enquiry isn't
 * silently dropped.
 */
export function turnstileCheck({
  secret,
  fetch: doFetch = fetch,
  timeoutMs = 8000,
}: TurnstileOptions): SpamCheck {
  return {
    async verify(token, ip) {
      if (!token || token.length > 2048) return false;
      const body = new URLSearchParams({ secret, response: token });
      if (ip) body.set('remoteip', ip);
      try {
        const res = await doFetch(TURNSTILE_VERIFY_URL, {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) return false;
        const parsed = responseSchema.safeParse(await res.json());
        return parsed.success && parsed.data.success;
      } catch {
        return false;
      }
    },
  };
}
