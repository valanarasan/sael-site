/**
 * Leads: types, validation, and the one place that picks the vendors behind LeadStore,
 * LeadNotifier, SpamCheck and RateLimiter. Swapping the Google Sheet for a CRM, or Resend for
 * another email service, means changing createEnquiryHandler() and nothing else.
 */
import type { LeadsConfig } from './config';
import { googleSheetStore, sheetRowUrl } from './google-sheets';
import { createEnquiryFlow, type EnquiryHandler } from './handle';
import { memoryLeadStore, passSpamCheck, silentNotifier } from './memory';
import { memoryRateLimiter } from './rate-limit';
import { resendNotifier } from './resend';
import { turnstileCheck } from './turnstile';
import type { LeadLogger } from './types';
import type { LeadOptions } from './validation';

export { ENV_KEYS, readLeadsConfig, type LeadsConfig, type LeadsEnv } from './config';
export type { EnquiryHandler, EnquiryOutcome } from './handle';
export { enquiryResponse, type EnquiryJson, type EnquiryPages } from './http';
export { MESSAGES as LEAD_MESSAGES } from './messages';
export { normaliseIndianMobile } from './phone';
export { TURNSTILE_FIELD } from './turnstile';
export type { Lead, LeadLogger, LeadMeta, LeadNotifier, LeadStore } from './types';
export {
  HONEYPOT_FIELD,
  validateLead,
  type LeadField,
  type LeadOptions,
  type LeadValidation,
} from './validation';

/** One JSON line per event on stdout/stderr. Callers never pass personal data. */
export const consoleLogger: LeadLogger = {
  // Server-side structured log line (the project allows only warn/error in browser code).
  // eslint-disable-next-line no-console
  info: (event, data) => console.info(JSON.stringify({ level: 'info', event, ...data })),
  error: (event, data) => console.error(JSON.stringify({ level: 'error', event, ...data })),
};

export interface HandlerDeps {
  options: LeadOptions;
  logger?: LeadLogger;
  fetch?: typeof fetch;
}

/** Builds the handler for the configured driver, or null (the endpoint then says "unavailable"). */
export function createEnquiryHandler(
  config: LeadsConfig,
  { options, logger = consoleLogger, fetch: doFetch = fetch }: HandlerDeps,
): EnquiryHandler | null {
  if (config.driver === 'unconfigured') {
    logger.error('enquiry.unconfigured', { problems: config.problems.join('; ') });
    return null;
  }

  const rateLimiter = memoryRateLimiter(config.rateLimit);

  if (config.driver === 'memory') {
    logger.error('enquiry.memory_driver', { warning: 'Leads are kept in memory and not emailed' });
    return createEnquiryFlow({
      store: memoryLeadStore(),
      notifier: silentNotifier,
      spamCheck: passSpamCheck,
      rateLimiter,
      options,
      logger,
    });
  }

  const { sheet, email } = config;
  return createEnquiryFlow({
    store: googleSheetStore({
      serviceAccountEmail: sheet.serviceAccountEmail,
      privateKey: sheet.privateKey,
      sheetId: sheet.id,
      tab: sheet.tab,
      fetch: doFetch,
    }),
    notifier: resendNotifier({
      apiKey: email.apiKey,
      from: email.from,
      to: email.to,
      rowUrl: (id) => sheetRowUrl(sheet.id, sheet.gid, id),
      fetch: doFetch,
    }),
    spamCheck: turnstileCheck({ secret: config.turnstileSecret, fetch: doFetch }),
    rateLimiter,
    options,
    logger,
  });
}
