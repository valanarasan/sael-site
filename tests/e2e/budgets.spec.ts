import { gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';

/** CLAUDE.md: home-page JavaScript under 100 KB gzip, INP at or under 200 ms. */
const JS_BUDGET_BYTES = 100 * 1024;
const INP_BUDGET_MS = 200;

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

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('home-page JavaScript stays under budget, chat included', async ({ page }) => {
    const bodies: Promise<Buffer>[] = [];
    const urls: string[] = [];
    page.on('response', (response) => {
      if (response.request().resourceType() !== 'script') return;
      urls.push(response.url());
      bodies.push(response.body());
    });

    await page.goto('/');
    // Inline scripts count too. Data blocks (JSON) aren't JavaScript.
    const inline = await page.evaluate(() =>
      [...document.querySelectorAll('script:not([src])')]
        .filter((s) => ['', 'module', 'text/javascript'].includes(s.getAttribute('type') ?? ''))
        .map((s) => s.textContent ?? ''),
    );
    await scrollThrough(page);
    await page.getByRole('button', { name: 'Ask SAEL' }).click();
    await page.waitForLoadState('networkidle');

    const files = await Promise.all(bodies);
    const total = [...files, ...inline.map((text) => Buffer.from(text))].reduce(
      (sum, body) => sum + gzipSync(body).length,
      0,
    );
    expect(urls.length).toBeGreaterThan(0);
    test.info().annotations.push({
      type: 'home-page JS',
      description: `${(total / 1024).toFixed(1)} KB gzip across ${urls.length} files and ${inline.length} inline scripts`,
    });
    expect(total).toBeLessThan(JS_BUDGET_BYTES);
  });

  test('taps respond within the INP budget on a slowed-down phone', async ({ page, context }) => {
    // Lighthouse can't measure INP on a page load, so this is the lab check. Real-user figures
    // have to come from the host's analytics once the site is live.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.goto('/');
    await page.evaluate(() => {
      const worst = { ms: 0 };
      Object.assign(window, { __worst: worst });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEventTiming[]) {
          if (entry.interactionId) worst.ms = Math.max(worst.ms, entry.duration);
        }
      }).observe({
        type: 'event',
        durationThreshold: 16,
        buffered: true,
      } as PerformanceObserverInit);
    });
    await page.waitForLoadState('networkidle');

    const faq = page.locator('#faq details summary').first();
    await faq.scrollIntoViewIfNeeded();
    await faq.click();
    await faq.click();

    const state = page.locator('#subsidy select').first();
    await state.scrollIntoViewIfNeeded();
    await state.selectOption({ index: 1 });

    const slider = page.locator('#subsidy input[type="range"]').first();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');

    await page.waitForTimeout(400);
    const worst = await page.evaluate(
      () => (window as unknown as { __worst: { ms: number } }).__worst.ms,
    );
    test.info().annotations.push({ type: 'worst interaction', description: `${worst} ms` });
    expect(worst).toBeLessThanOrEqual(INP_BUDGET_MS);
  });
});

test.describe('main photo loading', () => {
  for (const [path, picture] of [
    ['/', '[data-hero-slide] picture'],
    ['/blog', '[data-post-card] picture'],
  ] as const) {
    test(`${path} preloads exactly the files its first photo uses`, async ({ page }) => {
      await page.goto(path);
      const hint = page.locator('head link[rel="preload"][as="image"]');
      await expect(hint).toHaveCount(1);
      await expect(hint).toHaveAttribute('fetchpriority', 'high');
      const source = page.locator(picture).first().locator('source[type="image/avif"]');
      expect(await hint.getAttribute('imagesrcset')).toBe(await source.getAttribute('srcset'));
      expect(await hint.getAttribute('imagesizes')).toBe(await source.getAttribute('sizes'));
    });

    test(`${path} downloads its main photo only once`, async ({ page }) => {
      const photos: string[] = [];
      page.on('request', (request) => {
        if (request.resourceType() === 'image') photos.push(request.url());
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const [name] = (await page.locator(picture).first().locator('img').getAttribute('src'))
        ?.split('/')
        .at(-1)
        ?.split('_') ?? [''];
      const copies = photos.filter((url) => url.includes(`/${name}_`));
      expect(new Set(copies).size).toBe(1);
    });
  }

  test('the contact poster waits until the section is near', async ({ page }) => {
    const photos: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image') photos.push(request.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(photos.some((url) => url.includes('cta-poster'))).toBe(false);
  });
});

test('photos are served as AVIF to browsers that take it', async ({ page }) => {
  const types: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.url().includes('/_astro/')) {
      types.push(response.headers()['content-type'] ?? '');
    }
  });
  await page.goto('/');
  await scrollThrough(page);
  const photos = types.filter((type) => !type.includes('webp'));
  expect(types.length).toBeGreaterThan(5);
  // The logo is the one WebP; no browser that takes AVIF should be sent a JPEG.
  expect(photos.every((type) => type === 'image/avif')).toBe(true);
});
