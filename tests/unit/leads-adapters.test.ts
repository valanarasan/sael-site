import { generateKeyPairSync, createVerify } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  googleSheetStore,
  istTimestamp,
  rowFromRange,
  serviceAccountJwt,
  sheetRowUrl,
  SHEET_COLUMNS,
  SheetsError,
  toSheetRow,
} from '../../src/lib/leads/google-sheets';
import { displayPhone, escapeHtml, toLeadEmail } from '../../src/lib/leads/email';
import { parseLeadMeta } from '../../src/lib/leads/meta';
import { memoryLeadStore, passSpamCheck, silentNotifier } from '../../src/lib/leads/memory';
import { memoryRateLimiter } from '../../src/lib/leads/rate-limit';
import { RESEND_URL, ResendError, resendNotifier } from '../../src/lib/leads/resend';
import { withRetry } from '../../src/lib/leads/retry';
import { TURNSTILE_VERIFY_URL, turnstileCheck } from '../../src/lib/leads/turnstile';
import { fakeFetch, jsonResponse, leadFixture, metaFixture } from '../fixtures/leads';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('parseLeadMeta', () => {
  const at = new Date('2026-11-07T10:00:00Z');

  it('keeps the page path and UTM tags', () => {
    expect(
      parseLeadMeta(
        {
          page: '/blog/om-amc',
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'kochi rooftop',
        },
        at,
      ),
    ).toEqual({
      receivedAt: at,
      page: '/blog/om-amc',
      utm: { source: 'google', medium: 'cpc', campaign: 'kochi rooftop' },
    });
  });

  it('drops malformed or missing values instead of rejecting the enquiry', () => {
    expect(
      parseLeadMeta(
        { page: 'https://evil.example/', utm_source: '<script>', utm_medium: '', utm_campaign: 3 },
        at,
      ),
    ).toEqual({ receivedAt: at });
    expect(parseLeadMeta({ page: '/../etc' }, at)).toEqual({ receivedAt: at });
    expect(parseLeadMeta({}, at)).toEqual({ receivedAt: at });
  });
});

describe('withRetry', () => {
  it('returns the first success', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('a')).mockResolvedValueOnce('ok');
    const sleep = vi.fn(async () => {});
    const onRetry = vi.fn();
    await expect(withRetry(fn, { sleep, onRetry })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(300);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('backs off 300, 900 ms and rethrows the last error after the last attempt', async () => {
    const sleep = vi.fn(async () => {});
    const fn = vi.fn(async () => {
      throw new Error(`fail ${fn.mock.calls.length}`);
    });
    await expect(withRetry(fn, { sleep })).rejects.toThrow('fail 3');
    expect(sleep.mock.calls).toEqual([[300], [900]]);
  });

  it('uses a real timer by default', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(new Error('a')).mockResolvedValueOnce('ok');
    const result = withRetry(fn, { baseDelayMs: 10 });
    await vi.advanceTimersByTimeAsync(10);
    await expect(result).resolves.toBe('ok');
    vi.useRealTimers();
  });
});

describe('memoryRateLimiter', () => {
  it('allows max hits per window per key, then reports when to retry', async () => {
    let t = 0;
    const limiter = memoryRateLimiter({ max: 2, windowSeconds: 600, now: () => t });
    expect((await limiter.hit('a')).allowed).toBe(true);
    t = 1000;
    expect((await limiter.hit('a')).allowed).toBe(true);
    t = 2000;
    expect(await limiter.hit('a')).toEqual({ allowed: false, retryAfterSeconds: 598 });
    expect((await limiter.hit('b')).allowed).toBe(true);
    t = 600_001;
    expect((await limiter.hit('a')).allowed).toBe(true);
  });

  it('forgets the stalest key when it tracks too many', async () => {
    const limiter = memoryRateLimiter({ max: 1, windowSeconds: 600, now: () => 0, maxKeys: 2 });
    await limiter.hit('a');
    await limiter.hit('b');
    await limiter.hit('c'); // pushes out "a"
    expect((await limiter.hit('a')).allowed).toBe(true);
    expect((await limiter.hit('c')).allowed).toBe(false);
  });
});

describe('turnstileCheck', () => {
  it('posts the secret, token and IP and trusts Cloudflare’s answer', async () => {
    const fetch = fakeFetch(() => jsonResponse({ success: true }));
    expect(await turnstileCheck({ secret: 's3cret', fetch }).verify('tok', '203.0.113.5')).toBe(
      true,
    );
    expect(fetch.calls[0]?.url).toBe(TURNSTILE_VERIFY_URL);
    const body = fetch.calls[0]?.init?.body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({
      secret: 's3cret',
      response: 'tok',
      remoteip: '203.0.113.5',
    });
  });

  it('fails closed: no token, a "no", an HTTP error, bad JSON or no network', async () => {
    const check = (fetch: typeof globalThis.fetch, token = 'tok') =>
      turnstileCheck({ secret: 's', fetch }).verify(token, undefined);
    const never = fakeFetch(() => jsonResponse({ success: true }));
    expect(await turnstileCheck({ secret: 's', fetch: never }).verify(undefined, undefined)).toBe(
      false,
    );
    expect(await check(never, '')).toBe(false);
    expect(await check(never, 'x'.repeat(3000))).toBe(false);
    expect(never.calls).toHaveLength(0);
    expect(await check(fakeFetch(() => jsonResponse({ success: false })))).toBe(false);
    expect(await check(fakeFetch(() => jsonResponse({}, 500)))).toBe(false);
    expect(await check(fakeFetch(() => new Response('not json')))).toBe(false);
    expect(
      await check(
        fakeFetch(() => {
          throw new TypeError('fetch failed');
        }),
      ),
    ).toBe(false);
  });

  it('leaves out the IP when it is unknown', async () => {
    const fetch = fakeFetch(() => jsonResponse({ success: true }));
    await turnstileCheck({ secret: 's', fetch }).verify('tok', undefined);
    expect((fetch.calls[0]?.init?.body as URLSearchParams).has('remoteip')).toBe(false);
  });
});

describe('Google Sheet store', () => {
  it('formats the time in India, sortable as text', () => {
    expect(istTimestamp(new Date('2026-11-07T14:10:00Z'))).toBe('2026-11-07 19:40');
    expect(istTimestamp(new Date('2026-12-31T18:45:00Z'))).toBe('2027-01-01 00:15');
  });

  it('builds a row in column order, with status New and blanks for missing values', () => {
    const row = toSheetRow(leadFixture, metaFixture);
    expect(row).toHaveLength(SHEET_COLUMNS.length);
    expect(Object.fromEntries(SHEET_COLUMNS.map((c, i) => [c, row[i]]))).toEqual({
      'Received (IST)': '2026-11-07 19:40',
      Name: 'Test Customer',
      Phone: '+919000000001',
      Interest: 'Hybrid solar with battery',
      'District / PIN': 'Kochi',
      'Monthly bill': '₹2,000–5,000',
      Message: 'Roof faces south.',
      Page: '/',
      'UTM source': 'google',
      'UTM medium': 'cpc',
      'UTM campaign': 'rooftop',
      Consent: 'Yes',
      Status: 'New',
      Owner: '',
    });
    const bare = toSheetRow(
      { name: 'A B', phone: '+919000000001', interest: 'On-grid solar', consent: true },
      { receivedAt: metaFixture.receivedAt },
    );
    expect(bare.slice(4, 11)).toEqual(['', '', '', '', '', '', '']);
  });

  it('signs a service-account JWT that verifies with the public key', () => {
    const jwt = serviceAccountJwt('bot@example.iam.gserviceaccount.com', PEM, 1_700_000_000);
    const [header, claims, signature] = jwt.split('.');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, signature ?? '', 'base64url')).toBe(true);
    expect(JSON.parse(Buffer.from(claims ?? '', 'base64url').toString())).toEqual({
      iss: 'bot@example.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
  });

  it('reads the row number from the appended range', () => {
    expect(rowFromRange('Leads!A12:N12')).toBe('12');
    expect(rowFromRange("'SAEL Leads'!A7:N7")).toBe('7');
    expect(rowFromRange('nonsense')).toBeUndefined();
  });

  it('links to the row', () => {
    expect(sheetRowUrl('abc', '0', '12')).toBe(
      'https://docs.google.com/spreadsheets/d/abc/edit#gid=0&range=A12',
    );
  });

  const options = (fetch: typeof globalThis.fetch, now = () => 1_700_000_000_000) => ({
    serviceAccountEmail: 'bot@example.iam.gserviceaccount.com',
    privateKey: PEM.replace(/\n/g, '\\n'), // as stored in an env var
    sheetId: 'sheet-1',
    tab: 'Leads',
    fetch,
    now,
  });

  it('gets a token, appends the row as RAW text and returns the row number', async () => {
    const fetch = fakeFetch(
      () => jsonResponse({ access_token: 'tok-1', expires_in: 3600 }),
      () => jsonResponse({ updates: { updatedRange: 'Leads!A12:N12' } }),
    );
    const { id } = await googleSheetStore(options(fetch)).save(leadFixture, metaFixture);
    expect(id).toBe('12');

    const [token, append] = fetch.calls;
    expect(token?.url).toBe('https://oauth2.googleapis.com/token');
    expect((token?.init?.body as URLSearchParams).get('grant_type')).toBe(
      'urn:ietf:params:oauth:grant-type:jwt-bearer',
    );
    expect(append?.url).toBe(
      'https://sheets.googleapis.com/v4/spreadsheets/sheet-1/values/Leads!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS'.replace(
        'Leads!A1',
        encodeURIComponent('Leads!A1'),
      ),
    );
    expect(new Headers(append?.init?.headers).get('authorization')).toBe('Bearer tok-1');
    expect(JSON.parse(String(append?.init?.body))).toEqual({
      values: [toSheetRow(leadFixture, metaFixture)],
    });
  });

  it('reuses the token until a minute before it expires', async () => {
    let t = 1_700_000_000_000;
    const fetch = fakeFetch((call) =>
      call.url.includes('oauth2')
        ? jsonResponse({ access_token: `tok-${t}`, expires_in: 3600 })
        : jsonResponse({ updates: { updatedRange: 'Leads!A2:N2' } }),
    );
    const store = googleSheetStore(options(fetch, () => t));
    await store.save(leadFixture, metaFixture);
    t += 3_000_000; // 50 minutes later
    await store.save(leadFixture, metaFixture);
    expect(fetch.calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);
    t += 600_000; // 60 minutes after the first token
    await store.save(leadFixture, metaFixture);
    expect(fetch.calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(2);
  });

  it('throws a SheetsError with only the step and status', async () => {
    const tokenFails = fakeFetch(() => jsonResponse({ error: 'invalid_grant' }, 400));
    await expect(
      googleSheetStore(options(tokenFails)).save(leadFixture, metaFixture),
    ).rejects.toEqual(new SheetsError('token', 400));
    const appendFails = fakeFetch(
      () => jsonResponse({ access_token: 't', expires_in: 3600 }),
      () => jsonResponse({ error: { message: 'Test Customer +919000000001' } }, 403),
    );
    const error = await googleSheetStore(options(appendFails))
      .save(leadFixture, metaFixture)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SheetsError);
    expect(String((error as Error).message)).toBe('Google Sheets append failed with HTTP 403');
  });
});

describe('alert email', () => {
  it('escapes HTML and formats phone numbers', () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      '&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;',
    );
    expect(displayPhone('+919000000001')).toBe('+91 90000 00001');
    expect(displayPhone('12345')).toBe('12345');
  });

  it('has a readable subject, Call and WhatsApp buttons and a link to the row', () => {
    const email = toLeadEmail(leadFixture, metaFixture, 'https://docs.google.com/x#range=A12');
    expect(email.subject).toBe('New enquiry: Hybrid solar with battery · Kochi');
    expect(email.html).toContain('href="tel:+919000000001"');
    expect(email.html).toContain('href="https://wa.me/919000000001?text=');
    expect(email.html).toContain('Open in the SAEL Leads sheet');
    expect(email.html).toContain('+91 90000 00001');
    expect(email.html).toContain('2026-11-07 19:40 IST');
    expect(email.html).toContain('google / cpc / rooftop');
    expect(email.text).toContain('Phone: +91 90000 00001');
    expect(email.text).toContain('Sheet: https://docs.google.com/x#range=A12');
  });

  it('escapes everything the visitor typed and keeps the subject on one line', () => {
    const email = toLeadEmail(
      {
        ...leadFixture,
        name: '<img src=x onerror=alert(1)>',
        district: 'Kochi\r\nBcc: someone@example.com',
        message: '<script>alert(1)</script>',
      },
      metaFixture,
    );
    expect(email.html).not.toMatch(/<img|<script/);
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.html).not.toContain('Open in the SAEL Leads sheet');
  });

  it('leaves out empty rows and the district from the subject when missing', () => {
    const email = toLeadEmail(
      { name: 'A B', phone: '+919000000001', interest: 'On-grid solar', consent: true },
      { receivedAt: metaFixture.receivedAt },
    );
    expect(email.subject).toBe('New enquiry: On-grid solar');
    expect(email.html).not.toMatch(/District|Monthly bill|Message|Campaign|Page/);
  });
});

describe('resendNotifier', () => {
  const notifier = (fetch: typeof globalThis.fetch) =>
    resendNotifier({
      apiKey: 're_test',
      from: 'SAEL Website <enquiries@example.com>',
      to: ['sales@example.com', 'owner@example.com'],
      rowUrl: (id) => `https://sheet/#A${id}`,
      fetch,
    });

  it('sends the email with an idempotency key so retries never send twice', async () => {
    const fetch = fakeFetch(() => jsonResponse({ id: 'email-1' }));
    await notifier(fetch).notify(leadFixture, metaFixture, '12');
    await notifier(fetch).notify(leadFixture, metaFixture, '12');
    const [first, second] = fetch.calls;
    expect(first?.url).toBe(RESEND_URL);
    const headers = new Headers(first?.init?.headers);
    expect(headers.get('authorization')).toBe('Bearer re_test');
    expect(headers.get('idempotency-key')).toBe(`lead-12-${metaFixture.receivedAt.getTime()}`);
    expect(new Headers(second?.init?.headers).get('idempotency-key')).toBe(
      headers.get('idempotency-key'),
    );
    const body = JSON.parse(String(first?.init?.body)) as Record<string, unknown>;
    expect(body.to).toEqual(['sales@example.com', 'owner@example.com']);
    expect(body.subject).toBe('New enquiry: Hybrid solar with battery · Kochi');
    expect(String(body.html)).toContain('https://sheet/#A12');
  });

  it('throws a ResendError with only the status', async () => {
    const fetch = fakeFetch(() => jsonResponse({ message: 'Test Customer' }, 422));
    await expect(notifier(fetch).notify(leadFixture, metaFixture, '12')).rejects.toEqual(
      new ResendError(422),
    );
  });
});

describe('memory stand-ins', () => {
  it('keeps leads in order with sheet-like ids, notifies nobody and passes spam checks', async () => {
    const store = memoryLeadStore();
    expect(await store.save(leadFixture, metaFixture)).toEqual({ id: '2' });
    expect(await store.save(leadFixture, metaFixture)).toEqual({ id: '3' });
    expect(store.leads).toHaveLength(2);
    await expect(silentNotifier.notify(leadFixture, metaFixture, '2')).resolves.toBeUndefined();
    expect(await passSpamCheck.verify(undefined, undefined)).toBe(true);
  });
});
