// Endpoint tests: the enquiry flow and its HTTP wrapper, with fake stores, notifiers and checks.
import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  consoleLogger,
  createEnquiryHandler,
  enquiryResponse,
  readLeadsConfig,
  type EnquiryHandler,
  type Lead,
  type LeadMeta,
  type LeadNotifier,
  type LeadStore,
} from '../../src/lib/leads';
import { createEnquiryFlow, errorInfo, type EnquiryDeps } from '../../src/lib/leads/handle';
import { MAX_BODY_BYTES } from '../../src/lib/leads/http';
import { LEAD_MESSAGES } from '../../src/lib/leads';
import { SheetsError } from '../../src/lib/leads/google-sheets';
import {
  fakeFetch,
  formFixture,
  jsonResponse,
  leadOptionsFixture,
  recordingLogger,
} from '../fixtures/leads';

const NOW = new Date('2026-11-07T14:10:00Z');

function setup(overrides: Partial<EnquiryDeps> = {}) {
  const order: string[] = [];
  const saved: { lead: Lead; meta: LeadMeta }[] = [];
  const store: LeadStore = {
    save: vi.fn(async (lead: Lead, meta: LeadMeta) => {
      order.push('save');
      saved.push({ lead, meta });
      return { id: '12' };
    }),
  };
  const notifier: LeadNotifier = {
    notify: vi.fn(async () => {
      order.push('notify');
    }),
  };
  const logger = recordingLogger();
  const deps: EnquiryDeps = {
    store,
    notifier,
    spamCheck: { verify: vi.fn(async (token) => token === 'token-ok') },
    rateLimiter: { hit: vi.fn(async () => ({ allowed: true, retryAfterSeconds: 0 })) },
    options: leadOptionsFixture,
    logger,
    now: () => NOW,
    retry: { sleep: async () => {} },
    ...overrides,
  };
  return { deps, handle: createEnquiryFlow(deps), order, saved, logger };
}

/** Everything logged, as one string, to check that no personal data leaked into it. */
const logText = (logger: ReturnType<typeof recordingLogger>) => JSON.stringify(logger.events);
const PERSONAL = /Test Customer|9000000001|90000 00001|Kochi|Roof faces|203\.0\.113/;

describe('enquiry flow', () => {
  it('saves, then notifies, and logs only the row id', async () => {
    const { handle, order, saved, logger } = setup();
    expect(await handle(formFixture, '203.0.113.5')).toEqual({
      kind: 'saved',
      id: '12',
      notified: true,
    });
    expect(order).toEqual(['save', 'notify']);
    expect(saved[0]?.lead.phone).toBe('+919000000001');
    expect(saved[0]?.meta).toEqual({ receivedAt: NOW, page: '/', utm: { source: 'google' } });
    expect(logger.events).toEqual([{ level: 'info', event: 'enquiry.saved', data: { id: '12' } }]);
  });

  it('pretends success for a filled honeypot, without checking or saving anything', async () => {
    const { handle, deps } = setup();
    expect(await handle({ ...formFixture, website: 'http://spam.example' }, '1.2.3.4')).toEqual({
      kind: 'spam',
    });
    expect(deps.spamCheck.verify).not.toHaveBeenCalled();
    expect(deps.store.save).not.toHaveBeenCalled();
  });

  it('returns field errors for invalid input and logs only the field names', async () => {
    const { handle, deps, logger } = setup();
    const outcome = await handle({ ...formFixture, phone: '12345', consent: '' }, undefined);
    expect(outcome).toEqual({
      kind: 'invalid',
      errors: { phone: LEAD_MESSAGES.phone, consent: LEAD_MESSAGES.consent },
    });
    expect(deps.spamCheck.verify).not.toHaveBeenCalled();
    expect(logger.events).toEqual([
      { level: 'info', event: 'enquiry.invalid', data: { fields: 'consent,phone' } },
    ]);
  });

  it('checks Turnstile with the token and IP before the rate limit and saving', async () => {
    const { handle, deps } = setup();
    expect(await handle({ ...formFixture, 'cf-turnstile-response': 'bad' }, '203.0.113.5')).toEqual(
      { kind: 'spam-check-failed' },
    );
    expect(deps.spamCheck.verify).toHaveBeenCalledWith('bad', '203.0.113.5');
    expect(deps.rateLimiter.hit).not.toHaveBeenCalled();
    expect(deps.store.save).not.toHaveBeenCalled();

    const { 'cf-turnstile-response': _token, ...noToken } = formFixture;
    await handle(noToken, undefined);
    expect(deps.spamCheck.verify).toHaveBeenLastCalledWith(undefined, undefined);
  });

  it('rate-limits by IP (or one shared bucket when the IP is unknown)', async () => {
    const hit = vi.fn(async () => ({ allowed: false, retryAfterSeconds: 120 }));
    const { handle, deps } = setup({ rateLimiter: { hit } });
    expect(await handle(formFixture, '203.0.113.5')).toEqual({
      kind: 'rate-limited',
      retryAfterSeconds: 120,
    });
    expect(hit).toHaveBeenCalledWith('203.0.113.5');
    expect(deps.store.save).not.toHaveBeenCalled();
    await handle(formFixture, undefined);
    expect(hit).toHaveBeenLastCalledWith('unknown');
  });

  it('answers "unavailable" when the lead cannot be saved, and never notifies', async () => {
    const { handle, deps, logger } = setup({
      store: { save: vi.fn(async () => Promise.reject(new SheetsError('append', 403))) },
    });
    expect(await handle(formFixture, '203.0.113.5')).toEqual({ kind: 'unavailable' });
    expect(deps.notifier.notify).not.toHaveBeenCalled();
    expect(logger.events).toEqual([
      { level: 'error', event: 'enquiry.save_failed', data: { error: 'SheetsError', status: 403 } },
    ]);
  });

  it('retries the email, and keeps the lead when every attempt fails', async () => {
    const notify = vi.fn(async () => Promise.reject(new Error('Test Customer +919000000001')));
    const { handle, deps, logger } = setup({ notifier: { notify } });
    expect(await handle(formFixture, '203.0.113.5')).toEqual({
      kind: 'saved',
      id: '12',
      notified: false,
    });
    expect(deps.store.save).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(3);
    expect(logger.events.map((e) => e.event)).toEqual([
      'enquiry.saved',
      'enquiry.notify_retry',
      'enquiry.notify_retry',
      'enquiry.notify_failed',
    ]);
    expect(logText(logger)).not.toMatch(PERSONAL);
  });

  it('succeeds when a retry gets through', async () => {
    const notify = vi
      .fn<LeadNotifier['notify']>()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(undefined);
    const { handle } = setup({ notifier: { notify } });
    expect(await handle(formFixture, undefined)).toMatchObject({ notified: true });
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('never logs personal data, whatever happens', async () => {
    const { handle, logger } = setup({
      notifier: { notify: async () => Promise.reject(new Error('Test Customer')) },
    });
    await handle(formFixture, '203.0.113.5');
    await handle({ ...formFixture, phone: 'bad' }, '203.0.113.5');
    await handle({ ...formFixture, website: 'x' }, '203.0.113.5');
    expect(logText(logger)).not.toMatch(PERSONAL);
  });
});

describe('errorInfo', () => {
  it('keeps only the class name and an HTTP status', () => {
    expect(errorInfo(new SheetsError('token', 401))).toEqual({ error: 'SheetsError', status: 401 });
    expect(errorInfo(new TypeError('Test Customer'))).toEqual({ error: 'TypeError' });
    expect(errorInfo('oops')).toEqual({ error: 'string' });
  });
});

describe('enquiryResponse (HTTP)', () => {
  const pages = { thanks: '/enquiry/sent', problem: '/enquiry/problem' };
  const post = (
    body: string,
    {
      json = true,
      type = 'application/x-www-form-urlencoded',
      length,
    }: {
      json?: boolean;
      type?: string;
      length?: number;
    } = {},
  ) =>
    new Request('http://localhost/api/enquiry', {
      method: 'POST',
      headers: {
        'Content-Type': type,
        ...(json ? { Accept: 'application/json' } : {}),
        ...(length !== undefined ? { 'Content-Length': String(length) } : {}),
      },
      body,
    });
  const form = new URLSearchParams(formFixture).toString();
  const answer = (outcome: Awaited<ReturnType<EnquiryHandler>>): EnquiryHandler =>
    vi.fn(async () => outcome);

  it('passes the parsed fields and IP to the handler and answers ok', async () => {
    const handle = answer({ kind: 'saved', id: '12', notified: true });
    const res = await enquiryResponse(post(form), '203.0.113.5', handle, pages);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(handle).toHaveBeenCalledWith(formFixture, '203.0.113.5');
  });

  it.each([
    [{ kind: 'spam' } as const, 200, { ok: true }],
    [
      { kind: 'invalid', errors: { phone: 'Bad phone' } } as const,
      400,
      { ok: false, error: 'invalid', message: LEAD_MESSAGES.form, errors: { phone: 'Bad phone' } },
    ],
    [
      { kind: 'spam-check-failed' } as const,
      400,
      { ok: false, error: 'spam-check', message: LEAD_MESSAGES.spamCheck },
    ],
    [
      { kind: 'unavailable' } as const,
      503,
      { ok: false, error: 'unavailable', message: LEAD_MESSAGES.unavailable },
    ],
  ])('maps %o to HTTP %i', async (outcome, status, body) => {
    const res = await enquiryResponse(post(form), undefined, answer(outcome), pages);
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual(body);
  });

  it('sends Retry-After when rate-limited', async () => {
    const res = await enquiryResponse(
      post(form),
      undefined,
      answer({ kind: 'rate-limited', retryAfterSeconds: 120 }),
      pages,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('120');
    expect(await res.json()).toMatchObject({ error: 'rate-limited' });
  });

  it('redirects a post made without JavaScript to the result pages', async () => {
    const ok = await enquiryResponse(
      post(form, { json: false }),
      undefined,
      answer({ kind: 'saved', id: '1', notified: true }),
      pages,
    );
    expect(ok.status).toBe(303);
    expect(ok.headers.get('location')).toBe('/enquiry/sent');
    const bad = await enquiryResponse(
      post(form, { json: false }),
      undefined,
      answer({ kind: 'invalid', errors: {} }),
      pages,
    );
    expect(bad.headers.get('location')).toBe('/enquiry/problem');
  });

  it('refuses bodies that are not URL-encoded forms', async () => {
    const handle = answer({ kind: 'spam' });
    for (const type of ['application/json', 'multipart/form-data; boundary=x', 'text/plain']) {
      const res = await enquiryResponse(post('{}', { type }), undefined, handle, pages);
      expect(res.status).toBe(415);
    }
    expect(handle).not.toHaveBeenCalled();
  });

  it('refuses oversized bodies, by header or by actual size', async () => {
    const handle = answer({ kind: 'spam' });
    const declared = await enquiryResponse(
      post(form, { length: MAX_BODY_BYTES + 1 }),
      undefined,
      handle,
      pages,
    );
    expect(declared.status).toBe(413);
    const actual = await enquiryResponse(
      post(`message=${'x'.repeat(MAX_BODY_BYTES)}`),
      undefined,
      handle,
      pages,
    );
    expect(actual.status).toBe(413);
    expect(handle).not.toHaveBeenCalled();
  });

  it('answers "unavailable" when the service is not configured or the handler throws', async () => {
    const none = await enquiryResponse(post(form), undefined, null, pages);
    expect(none.status).toBe(503);
    const throws: EnquiryHandler = async () => {
      throw new Error('boom');
    };
    const res = await enquiryResponse(post(form), undefined, throws, pages);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'unavailable' });
    const noJs = await enquiryResponse(post(form, { json: false }), undefined, null, pages);
    expect(noJs.headers.get('location')).toBe('/enquiry/problem');
  });
});

const PEM = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs8', format: 'pem' })
  .toString();

const liveEnv = {
  TURNSTILE_SECRET_KEY: 'ts-secret',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'bot@example.iam.gserviceaccount.com',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: PEM.replace(/\n/g, '\\n'),
  LEADS_SHEET_ID: 'sheet-1',
  RESEND_API_KEY: 're_test',
  LEADS_EMAIL_FROM: 'SAEL Website <enquiries@example.com>',
  LEADS_EMAIL_TO: 'sales@example.com, owner@example.com',
};

describe('readLeadsConfig', () => {
  it('reads a complete live setup with defaults for the tab, gid and rate limit', () => {
    expect(readLeadsConfig(liveEnv)).toEqual({
      driver: 'live',
      rateLimit: { max: 5, windowSeconds: 600 },
      turnstileSecret: 'ts-secret',
      sheet: {
        serviceAccountEmail: 'bot@example.iam.gserviceaccount.com',
        privateKey: liveEnv.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        id: 'sheet-1',
        tab: 'Leads',
        gid: '0',
      },
      email: {
        apiKey: 're_test',
        from: 'SAEL Website <enquiries@example.com>',
        to: ['sales@example.com', 'owner@example.com'],
      },
    });
  });

  it('names the missing or wrong settings, never their values', () => {
    const config = readLeadsConfig({
      ...liveEnv,
      RESEND_API_KEY: '',
      LEADS_EMAIL_TO: 'not-an-email',
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'abc',
      ENQUIRY_RATE_LIMIT_MAX: '-1',
    });
    expect(config.driver).toBe('unconfigured');
    const problems = config.driver === 'unconfigured' ? config.problems.join('\n') : '';
    for (const key of [
      'RESEND_API_KEY',
      'LEADS_EMAIL_TO',
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
      'ENQUIRY_RATE_LIMIT_MAX',
    ])
      expect(problems).toContain(key);
    expect(problems).not.toContain('ts-secret');
    expect(readLeadsConfig({}).driver).toBe('unconfigured');
  });

  it('runs the memory driver only when asked, with its own rate limit settings', () => {
    expect(readLeadsConfig({ LEADS_DRIVER: 'memory', ENQUIRY_RATE_LIMIT_MAX: '1000' })).toEqual({
      driver: 'memory',
      rateLimit: { max: 1000, windowSeconds: 600 },
    });
    expect(readLeadsConfig({ LEADS_DRIVER: 'memory', ENQUIRY_RATE_LIMIT_MAX: 'x' }).driver).toBe(
      'unconfigured',
    );
    expect(readLeadsConfig({ LEADS_DRIVER: 'sheet' })).toEqual({
      driver: 'unconfigured',
      problems: ['LEADS_DRIVER: use "live" or "memory"'],
    });
  });
});

describe('createEnquiryHandler', () => {
  const options = leadOptionsFixture;

  it('returns null and logs the problems when unconfigured', () => {
    const logger = recordingLogger();
    expect(
      createEnquiryHandler(
        { driver: 'unconfigured', problems: ['A: missing'] },
        { options, logger },
      ),
    ).toBeNull();
    expect(logger.events).toEqual([
      { level: 'error', event: 'enquiry.unconfigured', data: { problems: 'A: missing' } },
    ]);
  });

  it('warns loudly when the memory driver starts, and accepts enquiries without a token', async () => {
    const logger = recordingLogger();
    const handle = createEnquiryHandler(
      { driver: 'memory', rateLimit: { max: 1, windowSeconds: 60 } },
      { options, logger },
    );
    expect(logger.events[0]).toMatchObject({ level: 'error', event: 'enquiry.memory_driver' });
    const { 'cf-turnstile-response': _token, ...fields } = formFixture;
    expect(await handle?.(fields, '1.1.1.1')).toMatchObject({ kind: 'saved', id: '2' });
    expect(await handle?.(fields, '1.1.1.1')).toMatchObject({ kind: 'rate-limited' });
  });

  it('wires Turnstile, the Google Sheet and Resend for the live driver', async () => {
    const fetch = fakeFetch((call) => {
      if (call.url.includes('turnstile')) return jsonResponse({ success: true });
      if (call.url.includes('oauth2')) return jsonResponse({ access_token: 't', expires_in: 3600 });
      if (call.url.includes('sheets.googleapis.com'))
        return jsonResponse({ updates: { updatedRange: 'Leads!A9:N9' } });
      return jsonResponse({ id: 'email-1' });
    });
    const config = readLeadsConfig({ ...liveEnv, LEADS_SHEET_GID: '42' });
    const handle = createEnquiryHandler(config, { options, logger: recordingLogger(), fetch });
    expect(await handle?.(formFixture, '203.0.113.5')).toEqual({
      kind: 'saved',
      id: '9',
      notified: true,
    });
    expect(fetch.calls.map((c) => new URL(c.url).hostname)).toEqual([
      'challenges.cloudflare.com',
      'oauth2.googleapis.com',
      'sheets.googleapis.com',
      'api.resend.com',
    ]);
    const email = JSON.parse(String(fetch.calls[3]?.init?.body)) as { html: string };
    expect(email.html).toContain('#gid=42&amp;range=A9');
  });
});

describe('consoleLogger', () => {
  it('writes one JSON line per event: info to stdout, errors to stderr', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogger.info('enquiry.saved', { id: '12' });
    consoleLogger.error('enquiry.save_failed');
    expect(info).toHaveBeenCalledWith('{"level":"info","event":"enquiry.saved","id":"12"}');
    expect(error).toHaveBeenCalledWith('{"level":"error","event":"enquiry.save_failed"}');
    info.mockRestore();
    error.mockRestore();
  });
});
