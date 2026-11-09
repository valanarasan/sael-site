import { expect, test, type Page } from '@playwright/test';
import { SECURITY_HEADERS } from '../../server/security-headers.mjs';

/** Records anything the Content Security Policy blocks, from the first script on the page. */
async function watchForBlocks(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.assign(window, { __cspBlocks: seen });
    document.addEventListener('securitypolicyviolation', (e) =>
      seen.push(`${e.violatedDirective} blocked ${e.blockedURI} (${e.sample})`),
    );
  });
  return () => page.evaluate(() => (window as unknown as { __cspBlocks: string[] }).__cspBlocks);
}

async function scrollThrough(page: Page) {
  const atBottom = () =>
    page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4,
    );
  for (let i = 0; i < 200 && !(await atBottom()); i++) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(800);
}

test.describe('security headers', () => {
  // A static page, a feed, an image-free route, the server route and a missing page.
  for (const path of ['/', '/blog', '/rss.xml', '/robots.txt', '/api/enquiry', '/no-such-page']) {
    test(`are sent on ${path}`, async ({ request }) => {
      const res = await request.get(path);
      const headers = res.headers();
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
        expect(headers[name.toLowerCase()], name).toBe(value);
      }
    });
  }

  test('say what the budgets ask for', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toMatch(/^max-age=\d{8,}/);
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    for (const feature of ['camera', 'microphone', 'geolocation']) {
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain(`${feature}=()`);
    }
  });

  test('stop the site being framed by another site', async ({ page, baseURL }) => {
    await page.route('https://other-site.example/', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<iframe src="${baseURL}/blog"></iframe>`,
      }),
    );
    await page.goto('https://other-site.example/');
    // A refused frame ends up on the browser's own error page, with none of the site in it.
    await expect.poll(() => page.frames()[1]?.url()).toMatch(/^chrome-error:/);
    await expect(page.frameLocator('iframe').locator('main')).toHaveCount(0);
  });
});

test.describe('content security policy', () => {
  for (const path of ['/', '/blog', '/enquiry/sent', '/enquiry/problem', '/no-such-page']) {
    test(`locks down scripts and plugins on ${path}`, async ({ page }) => {
      await page.goto(path);
      const policy = await page
        .locator('meta[http-equiv="content-security-policy"]')
        .getAttribute('content');
      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("base-uri 'self'");
      expect(policy).toContain("form-action 'self'");
      expect(policy).toMatch(/script-src 'self' https:\/\/challenges\.cloudflare\.com/);
      expect(policy).not.toContain('unsafe-inline');
      expect(policy).not.toContain('unsafe-eval');
    });
  }

  test('no page has a style attribute, which the policy would block', async ({ page }) => {
    for (const path of ['/', '/blog', '/enquiry/sent', '/no-such-page']) {
      await page.goto(path);
      const html = await (await page.request.get(path)).text();
      expect(html, path).not.toMatch(/<[a-z][^>]*\sstyle="/i);
    }
  });

  test('blocks nothing with reduced motion', async ({ page }) => {
    const blocks = await watchForBlocks(page);
    await page.goto('/');
    await scrollThrough(page);
    expect(await blocks()).toEqual([]);
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('blocks nothing through the whole page and the islands', async ({ page }) => {
      const blocks = await watchForBlocks(page);
      await page.goto('/');
      await scrollThrough(page);

      // The viewer and the chat add elements at runtime.
      const gallery = page.locator('[data-gallery-root]').first();
      await gallery.scrollIntoViewIfNeeded();
      await expect(gallery).toHaveAttribute('data-ready', 'true');
      await gallery
        .getByRole('button', { name: /^Open photo/ })
        .first()
        .focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: 'Photo viewer' })).toBeVisible();
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Ask SAEL' }).click();
      await page.waitForLoadState('networkidle');

      expect(await blocks()).toEqual([]);
    });
  });

  test('blocks nothing on the blog with motion and filters', async ({ page }) => {
    const blocks = await watchForBlocks(page);
    await page.goto('/blog');
    await page.getByRole('button', { name: 'Monsoon' }).click();
    expect(await blocks()).toEqual([]);
  });
});

test.describe('behind a proxy', () => {
  const form = {
    name: 'Test Customer',
    phone: '9000000001',
    interest: 'On-grid solar',
    consent: 'on',
  };
  const proxied = {
    Accept: 'application/json',
    'X-Forwarded-Host': 'saelenergy.com',
    'X-Forwarded-Proto': 'https',
  };

  test('accepts the form from the real domain', async ({ request }) => {
    const res = await request.post('/api/enquiry', {
      form,
      headers: { ...proxied, Origin: 'https://saelenergy.com' },
    });
    expect(res.status()).toBe(200);
  });

  test('refuses it from another site, and ignores a forged host', async ({ request }) => {
    const evil = await request.post('/api/enquiry', {
      form,
      headers: { ...proxied, Origin: 'https://evil.example' },
    });
    expect(evil.status()).toBe(403);

    const forged = await request.post('/api/enquiry', {
      form,
      headers: {
        ...proxied,
        'X-Forwarded-Host': 'evil.example',
        Origin: 'https://evil.example',
      },
    });
    expect(forged.status()).toBe(403);
  });
});
