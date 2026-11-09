/**
 * The enquiry flow, independent of HTTP and of any vendor:
 * validate (honeypot first) → spam check → rate limit → save → notify (with retries).
 * The lead is saved before anyone is notified, so a failed email never loses it.
 */
import { withRetry, type RetryOptions } from './retry';
import { parseLeadMeta } from './meta';
import { TURNSTILE_FIELD } from './turnstile';
import type { LeadLogger, LeadNotifier, LeadStore, RateLimiter, SpamCheck } from './types';
import { validateLead, type LeadField, type LeadOptions } from './validation';

export type EnquiryOutcome =
  | { kind: 'saved'; id: string; notified: boolean }
  /** Honeypot filled: the visitor (a bot) is shown success, nothing is saved. */
  | { kind: 'spam' }
  | { kind: 'invalid'; errors: Partial<Record<LeadField | 'form', string>> }
  | { kind: 'spam-check-failed' }
  | { kind: 'rate-limited'; retryAfterSeconds: number }
  | { kind: 'unavailable' };

export interface EnquiryDeps {
  store: LeadStore;
  notifier: LeadNotifier;
  spamCheck: SpamCheck;
  rateLimiter: RateLimiter;
  options: LeadOptions;
  logger: LeadLogger;
  now?: () => Date;
  retry?: RetryOptions;
}

export type EnquiryHandler = (
  fields: Record<string, unknown>,
  ip: string | undefined,
) => Promise<EnquiryOutcome>;

/** Error details that are safe to log: the class name and an HTTP status, never the message. */
export function errorInfo(error: unknown): Record<string, string | number> {
  const name = error instanceof Error ? error.name : typeof error;
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
      ? { status: error.status }
      : {};
  return { error: name, ...status };
}

export function createEnquiryFlow(deps: EnquiryDeps): EnquiryHandler {
  const { store, notifier, spamCheck, rateLimiter, options, logger, now = () => new Date() } = deps;
  const attempts = deps.retry?.attempts ?? 3;

  return async (fields, ip) => {
    const result = validateLead(fields, options);
    if (!result.ok && result.reason === 'spam') {
      logger.info('enquiry.honeypot');
      return { kind: 'spam' };
    }
    if (!result.ok) {
      logger.info('enquiry.invalid', { fields: Object.keys(result.errors).sort().join(',') });
      return { kind: 'invalid', errors: result.errors };
    }

    const token = fields[TURNSTILE_FIELD];
    if (!(await spamCheck.verify(typeof token === 'string' ? token : undefined, ip))) {
      logger.info('enquiry.spam_check_failed');
      return { kind: 'spam-check-failed' };
    }

    const limit = await rateLimiter.hit(ip ?? 'unknown');
    if (!limit.allowed) {
      logger.info('enquiry.rate_limited');
      return { kind: 'rate-limited', retryAfterSeconds: limit.retryAfterSeconds };
    }

    const meta = parseLeadMeta(fields, now());
    let id: string;
    try {
      ({ id } = await store.save(result.lead, meta));
    } catch (error) {
      logger.error('enquiry.save_failed', errorInfo(error));
      return { kind: 'unavailable' };
    }
    logger.info('enquiry.saved', { id });

    try {
      await withRetry(() => notifier.notify(result.lead, meta, id), {
        ...deps.retry,
        attempts,
        onRetry: (attempt, error) =>
          logger.info('enquiry.notify_retry', { id, attempt, ...errorInfo(error) }),
      });
      return { kind: 'saved', id, notified: true };
    } catch (error) {
      // The lead is safe in the store; the team still sees it there.
      logger.error('enquiry.notify_failed', { id, attempts, ...errorInfo(error) });
      return { kind: 'saved', id, notified: false };
    }
  };
}
