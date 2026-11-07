/**
 * HTTP side of the enquiry endpoint: reads the posted form, runs the flow and answers in JSON
 * (when the form's script asks for it) or with a redirect (when the browser posted the form
 * without JavaScript).
 */
import type { EnquiryHandler, EnquiryOutcome } from './handle';
import { MESSAGES } from './messages';

export const MAX_BODY_BYTES = 16 * 1024;

export interface EnquiryPages {
  /** Shown after a successful post without JavaScript. */
  thanks: string;
  /** Shown when a post without JavaScript fails. */
  problem: string;
}

export type EnquiryJson =
  | { ok: true }
  | {
      ok: false;
      error: 'invalid' | 'spam-check' | 'rate-limited' | 'unavailable' | 'bad-request';
      message: string;
      errors?: Partial<Record<string, string>>;
    };

const NO_STORE = { 'Cache-Control': 'no-store' };

function json(body: EnquiryJson, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE, ...headers },
  });
}

function toJson(outcome: EnquiryOutcome): [EnquiryJson, number, Record<string, string>?] {
  switch (outcome.kind) {
    case 'saved':
    case 'spam':
      return [{ ok: true }, 200];
    case 'invalid':
      return [{ ok: false, error: 'invalid', message: MESSAGES.form, errors: outcome.errors }, 400];
    case 'spam-check-failed':
      return [{ ok: false, error: 'spam-check', message: MESSAGES.spamCheck }, 400];
    case 'rate-limited':
      return [
        { ok: false, error: 'rate-limited', message: MESSAGES.rateLimited },
        429,
        { 'Retry-After': String(outcome.retryAfterSeconds) },
      ];
    case 'unavailable':
      return [{ ok: false, error: 'unavailable', message: MESSAGES.unavailable }, 503];
  }
}

type ReadResult = Record<string, string> | 'too-large' | null;

/**
 * Reads a URL-encoded form body (what browsers and the form script send), at most
 * MAX_BODY_BYTES. Anything else is refused: Astro's cross-site check (security.checkOrigin)
 * covers form bodies, so accepting other types would let them around it.
 */
async function readFields(request: Request): Promise<ReadResult> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/x-www-form-urlencoded')) return null;
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return 'too-large';
  return Object.fromEntries(new URLSearchParams(raw));
}

export async function enquiryResponse(
  request: Request,
  ip: string | undefined,
  handle: EnquiryHandler | null,
  pages: EnquiryPages,
): Promise<Response> {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const redirect = (to: string) =>
    new Response(null, { status: 303, headers: { Location: to, ...NO_STORE } });
  const fail = (body: EnquiryJson, status: number, headers?: Record<string, string>) =>
    wantsJson ? json(body, status, headers) : redirect(pages.problem);

  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES)
    return fail({ ok: false, error: 'bad-request', message: MESSAGES.form }, 413);

  if (!handle) return fail({ ok: false, error: 'unavailable', message: MESSAGES.unavailable }, 503);

  const fields = await readFields(request);
  if (fields === 'too-large')
    return fail({ ok: false, error: 'bad-request', message: MESSAGES.form }, 413);
  if (!fields) return fail({ ok: false, error: 'bad-request', message: MESSAGES.form }, 415);

  let outcome: EnquiryOutcome;
  try {
    outcome = await handle(fields, ip);
  } catch {
    outcome = { kind: 'unavailable' };
  }
  const [body, status, headers] = toJson(outcome);
  if (wantsJson) return json(body, status, headers);
  return body.ok ? redirect(pages.thanks) : redirect(pages.problem);
}
