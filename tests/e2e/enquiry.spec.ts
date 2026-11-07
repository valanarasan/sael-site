import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

// The test server runs the enquiry endpoint with LEADS_DRIVER=memory (playwright.config.ts):
// nothing is written to the real sheet or emailed. Test numbers are not real.

async function openForm(page: Page, path = '/') {
  await page.goto(path);
  const form = page.locator('form[data-enquiry-form]');
  await form.scrollIntoViewIfNeeded();
  await expect(form).toHaveAttribute('data-ready', 'true');
  return form;
}

async function fillValid(page: Page) {
  await page.getByLabel('Name', { exact: true }).fill('Test Customer');
  await page.getByLabel('Mobile number').fill('90000 00001');
  await page.getByLabel('District or PIN code').fill('Kochi');
  await page.getByLabel('Interest').selectOption('Hybrid solar with battery');
  await page.getByLabel('SAEL may contact me about my enquiry.').check();
}

const submit = (page: Page) => page.getByRole('button', { name: 'Request a callback' });

test.describe('enquiry form', () => {
  test('sends the enquiry and shows the thank-you with a WhatsApp link', async ({ page }) => {
    const form = await openForm(page);
    await fillValid(page);
    const response = page.waitForResponse('**/api/enquiry');
    await submit(page).click();
    expect((await response).status()).toBe(200);

    const done = page.locator('[data-form-ok]');
    await expect(done).toBeVisible();
    await expect(done).toBeFocused();
    await expect(done).toContainText('Thank you. A SAEL consultant will call you');
    await expect(form).toBeHidden();
    const whatsapp = done.getByRole('link', { name: 'Continue on WhatsApp' });
    await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=/);
    await expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
    await expectNoSeriousA11yViolations(page);
  });

  test('sends the page and campaign tags with the form', async ({ page }) => {
    await openForm(page, '/?utm_source=google&utm_medium=cpc&utm_campaign=kochi');
    await fillValid(page);
    const request = page.waitForRequest('**/api/enquiry');
    await submit(page).click();
    const body = new URLSearchParams((await request).postData() ?? '');
    expect(body.get('page')).toBe('/');
    expect(body.get('utm_source')).toBe('google');
    expect(body.get('utm_medium')).toBe('cpc');
    expect(body.get('utm_campaign')).toBe('kochi');
    expect(body.get('phone')).toBe('90000 00001');
    expect((await request).headers()['accept']).toContain('application/json');
  });

  test('checks the name, number and consent before sending', async ({ page }) => {
    await openForm(page);
    let posted = false;
    page.on('request', (r) => r.url().includes('/api/enquiry') && (posted = true));
    const error = page.locator('[data-form-error]');

    await submit(page).click();
    await expect(error).toHaveText('Enter your name (letters only, 2 to 80 characters).');
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Name', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Name', { exact: true })).toHaveAttribute(
      'aria-describedby',
      'q-err',
    );

    await page.getByLabel('Name', { exact: true }).fill('Test Customer');
    await page.getByLabel('Mobile number').fill('12345');
    await submit(page).click();
    await expect(error).toHaveText('Enter a 10-digit mobile number.');
    await expect(page.getByLabel('Mobile number')).toBeFocused();
    await expect(page.getByLabel('Name', { exact: true })).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await page.getByLabel('Mobile number').fill('+91 90000 00001');
    await submit(page).click();
    await expect(error).toHaveText('Please agree to be contacted about your enquiry.');
    expect(posted).toBe(false);
  });

  test('shows the server’s field errors', async ({ page }) => {
    await page.route('**/api/enquiry', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: 'invalid',
          message: 'Something went wrong with the form. Please try again.',
          errors: { district: 'Enter your district, or a 6-digit PIN code.' },
        }),
      }),
    );
    await openForm(page);
    await fillValid(page);
    await submit(page).click();
    await expect(page.locator('[data-form-error]')).toHaveText(
      'Enter your district, or a 6-digit PIN code.',
    );
    await expect(page.getByLabel('District or PIN code')).toHaveAttribute('aria-invalid', 'true');
    await expect(submit(page)).toBeEnabled();
  });

  test('explains when the visitor is rate-limited or the server is down', async ({ page }) => {
    let reply: 'limited' | 'down' = 'limited';
    await page.route('**/api/enquiry', (route) =>
      reply === 'limited'
        ? route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              ok: false,
              error: 'rate-limited',
              message:
                'Too many enquiries from this connection. Please wait a few minutes, or call us.',
            }),
          })
        : route.abort('failed'),
    );
    await openForm(page);
    await fillValid(page);
    await submit(page).click();
    await expect(page.locator('[data-form-error]')).toContainText('Too many enquiries');

    reply = 'down';
    await submit(page).click();
    await expect(page.locator('[data-form-error]')).toHaveText(
      "We couldn't send your enquiry just now. Please try again shortly, or call us.",
    );
    await expect(page.locator('form[data-enquiry-form]')).toBeVisible();
  });

  test('shows "Sending…" and blocks a second submit while sending', async ({ page }) => {
    let calls = 0;
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/enquiry', async (route) => {
      calls++;
      await held;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await openForm(page);
    await fillValid(page);
    await submit(page).click();
    const busy = page.locator('[data-submit]');
    await expect(busy).toHaveText('Sending…');
    await expect(busy).toBeDisabled();
    await page
      .locator('form[data-enquiry-form]')
      .evaluate((f: HTMLFormElement) => f.requestSubmit());
    release();
    await expect(page.locator('[data-form-ok]')).toBeVisible();
    expect(calls).toBe(1);
  });
});

test.describe('enquiry form without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('posts normally and lands on the thank-you page', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Name', { exact: true }).fill('Test Customer');
    await page.getByLabel('Mobile number').fill('9000000001');
    await page.getByLabel('Interest').selectOption('On-grid solar');
    await page.getByLabel('SAEL may contact me about my enquiry.').check();
    await submit(page).click();
    await expect(page).toHaveURL(/\/enquiry\/sent$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Thank you');
    await expect(page.getByRole('link', { name: 'Continue on WhatsApp' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });
});

test.describe('/api/enquiry', () => {
  const valid = {
    name: 'Test Customer',
    phone: '9000000001',
    interest: 'On-grid solar',
    consent: 'on',
  };

  test('accepts a valid form post and validates on the server', async ({ request }) => {
    const ok = await request.post('/api/enquiry', {
      form: valid,
      headers: { Accept: 'application/json' },
    });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toEqual({ ok: true });
    expect(ok.headers()['cache-control']).toBe('no-store');

    const bad = await request.post('/api/enquiry', {
      form: { ...valid, phone: '12345', interest: 'Solar atta chakki' },
      headers: { Accept: 'application/json' },
    });
    expect(bad.status()).toBe(400);
    expect(await bad.json()).toMatchObject({
      ok: false,
      error: 'invalid',
      errors: {
        phone: 'Enter a 10-digit mobile number.',
        interest: "Choose what you're interested in.",
      },
    });
  });

  test('pretends success to bots that fill the honeypot', async ({ request }) => {
    const res = await request.post('/api/enquiry', {
      form: { ...valid, website: 'http://spam.example' },
      headers: { Accept: 'application/json' },
    });
    expect(res.status()).toBe(200);
  });

  test('refuses cross-site form posts, other body types and other methods', async ({ request }) => {
    const crossSite = await request.post('/api/enquiry', {
      form: valid,
      headers: { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' },
    });
    expect(crossSite.status()).toBe(403);

    const json = await request.post('/api/enquiry', {
      data: valid,
      headers: { Accept: 'application/json' },
    });
    expect(json.status()).toBe(415);

    const get = await request.get('/api/enquiry');
    expect(get.status()).toBe(405);
    expect(get.headers()['allow']).toBe('POST');
  });

  test('redirects posts without JavaScript to the result pages', async ({ request }) => {
    const sent = await request.post('/api/enquiry', { form: valid, maxRedirects: 0 });
    expect(sent.status()).toBe(303);
    expect(sent.headers()['location']).toBe('/enquiry/sent');
    const problem = await request.post('/api/enquiry', {
      form: { ...valid, phone: '1' },
      maxRedirects: 0,
    });
    expect(problem.headers()['location']).toBe('/enquiry/problem');
  });
});

test.describe('result pages', () => {
  test('the problem page offers the phone number and a way back', async ({ page }) => {
    await page.goto('/enquiry/problem');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "We couldn't send your enquiry",
    );
    await expect(page.locator('main').getByRole('link', { name: /^\+91/ })).toHaveAttribute(
      'href',
      /^tel:\+91/,
    );
    await expect(page.getByRole('link', { name: 'Back to the form' })).toHaveAttribute(
      'href',
      '/#contact',
    );
    await expectNoSeriousA11yViolations(page);
  });

  test('the thank-you page passes axe', async ({ page }) => {
    await page.goto('/enquiry/sent');
    await expectNoSeriousA11yViolations(page);
  });
});
