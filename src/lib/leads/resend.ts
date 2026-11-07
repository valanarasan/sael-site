/** LeadNotifier that emails the sales list through Resend's REST API (https://resend.com/docs). */
import { toLeadEmail } from './email';
import type { LeadNotifier } from './types';

export const RESEND_URL = 'https://api.resend.com/emails';

/** Carries only the HTTP status, never the request or response body (which hold the lead). */
export class ResendError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Resend failed with HTTP ${status}`);
    this.name = 'ResendError';
    this.status = status;
  }
}

export interface ResendOptions {
  apiKey: string;
  from: string;
  to: string[];
  /** Link to the lead's row, from its id. */
  rowUrl?: (id: string) => string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export function resendNotifier({
  apiKey,
  from,
  to,
  rowUrl,
  fetch: doFetch = fetch,
  timeoutMs = 10_000,
}: ResendOptions): LeadNotifier {
  return {
    async notify(lead, meta, id) {
      const email = toLeadEmail(lead, meta, rowUrl?.(id));
      const res = await doFetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Same key on every retry, so a retried request never sends a second email.
          'Idempotency-Key': `lead-${id}-${meta.receivedAt.getTime()}`,
        },
        body: JSON.stringify({
          from,
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new ResendError(res.status);
    },
  };
}
