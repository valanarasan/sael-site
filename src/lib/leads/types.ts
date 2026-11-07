/**
 * Contracts the enquiry handler depends on. Which sheet, CRM, email service or spam check sits
 * behind them is decided only in lib/leads/index.ts.
 */

/** A validated enquiry. `phone` is always "+91" followed by 10 digits. */
export interface Lead {
  name: string;
  phone: string;
  interest: string;
  /** District or PIN code. */
  district?: string;
  /** Monthly electricity bill band. */
  bill?: string;
  message?: string;
  consent: true;
}

/** Where and when the enquiry came from (no personal data). */
export interface LeadMeta {
  receivedAt: Date;
  /** Path of the page the form was on, e.g. "/" or "/blog/om-amc". */
  page?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
}

export interface LeadStore {
  /** Saves the lead and returns its id (for the sheet: the row number). */
  save(lead: Lead, meta: LeadMeta): Promise<{ id: string }>;
}

export interface LeadNotifier {
  /** Alerts the sales team. May be retried with the same id, so it must be idempotent. */
  notify(lead: Lead, meta: LeadMeta, id: string): Promise<void>;
}

/** Bot check (Cloudflare Turnstile today). */
export interface SpamCheck {
  verify(token: string | undefined, ip: string | undefined): Promise<boolean>;
}

export interface RateLimiter {
  /** Counts one attempt for `key`; `allowed` is false once the limit is reached. */
  hit(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}

/** Structured logs. Callers never pass names, phone numbers, messages or IP addresses. */
export interface LeadLogger {
  info(event: string, data?: Record<string, string | number | boolean>): void;
  error(event: string, data?: Record<string, string | number | boolean>): void;
}
