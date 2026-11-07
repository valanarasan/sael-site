import { expect, test, type Page } from '@playwright/test';

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) > 860;

/** Wheels down until smooth scrolling really reaches the bottom, so every effect has run. */
async function scrollThrough(page: Page) {
  const atBottom = () =>
    page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4,
    );
  for (let i = 0; i < 200 && !(await atBottom()); i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(3000);
}

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('loads GSAP and runs without errors through the whole page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const motion = page.waitForResponse((r) => /\/motion\.[\w-]+\.js$/.test(r.url()));
    await page.goto('/');
    await motion;
    await expect(page.locator('html')).toHaveClass(/motion-on/);
    await scrollThrough(page);
    expect(errors).toEqual([]);
  });

  test('every animated element ends fully visible and in place', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-on/);
    await scrollThrough(page);
    const unfinished = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '[data-split] .w > i, [data-motion] > *, [data-motion="tilt-up"], [data-motion="clip-right"]',
        ),
      ]
        // Skip elements that aren't rendered, and v5's own 0.85–0.86 text opacity.
        .filter((el) => !el.closest('[hidden]') && el.getClientRects().length > 0)
        .filter((el) => {
          const cs = getComputedStyle(el);
          const moved = cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)';
          return parseFloat(cs.opacity) < 0.8 || moved;
        })
        .map(
          (el) =>
            `${el.tagName}.${el.className} opacity=${getComputedStyle(el).opacity} transform=${getComputedStyle(el).transform}`,
        ),
    );
    expect(unfinished).toEqual([]);
  });

  test('pins the hero on desktop and moves the caption through the slides', async ({ page }) => {
    test.skip(!isDesktop(page), 'desktop only');
    await page.goto('/');
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    const title = page.locator('[data-hero-title]');
    const first = await title.textContent();
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(80);
    }
    await expect(title).not.toHaveText(first ?? '');
    await expect(page.locator('[data-hero-index]')).not.toHaveText('01');
  });

  test('does not pin the hero on phones', async ({ page }) => {
    test.skip(isDesktop(page), 'phone only');
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-on/);
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
  });

  test('keeps cumulative layout shift under 0.1 while loading and scrolling', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await scrollThrough(page);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.1);
  });

  test('section links glide to their section', async ({ page }) => {
    test.skip(!isDesktop(page), 'header links are desktop only');
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-on/);
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Subsidy' })
      .click();
    await expect(page).toHaveURL(/#subsidy$/);
    await expect
      .poll(
        () => page.locator('#subsidy').evaluate((el) => Math.round(el.getBoundingClientRect().top)),
        { timeout: 4000 },
      )
      .toBeLessThan(5);
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Subsidy' }),
    ).toHaveClass(/act/);
  });

  test('smooth scrolling pauses while the menu is open', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-on/);
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('html')).toHaveClass(/lenis-stopped/);
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/lenis-stopped/);
  });

  test('the gallery row is not left scrolled after its cards slide in', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-on/);
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2600);
    expect(await page.locator('[data-gallery]').evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test('counts the offices up to 3', async ({ page }) => {
    await page.goto('/');
    const count = page.locator('.band [data-count]');
    await count.scrollIntoViewIfNeeded();
    await expect(count).toHaveText('3', { timeout: 5000 });
  });

  test('plays the contact video only while it is on screen', async ({ page }) => {
    await page.goto('/');
    const video = page.locator('video[data-contact-video]');
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 5000 })
      .toBe(true);
  });

  test('shows the custom cursor for a mouse, labelled over the gallery', async ({ page }) => {
    test.skip(!isDesktop(page), 'mouse only');
    await page.goto('/');
    const dot = page.locator('[data-cursor-dot]');
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    const box = await page.locator('[data-gallery-item]').first().boundingBox();
    if (!box) throw new Error('no gallery item');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2);
    await expect(dot).toHaveClass(/on/);
    await expect(dot).toHaveClass(/big/);
    await expect(dot).toHaveText('Drag');
  });
});

test.describe('with reduced motion', () => {
  test('never downloads GSAP, never pins, and shows everything at once', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(urls.some((u) => /\/motion\.[\w-]+\.js$/.test(u))).toBe(false);
    await expect(page.locator('html')).not.toHaveClass(/motion-ok/);
    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.locator('[data-hero-copy]')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-hero-caption]')).toBeVisible();
  });

  test('stops the marquees and leaves the video on its poster', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.st')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('[data-ticker]')).toHaveCSS('animation-name', 'none');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    expect(
      await page.locator('video[data-contact-video]').evaluate((v: HTMLVideoElement) => v.paused),
    ).toBe(true);
  });

  test('never shows the custom cursor', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(400, 400);
    await page.mouse.move(420, 420);
    await expect(page.locator('[data-cursor-dot]')).not.toHaveClass(/on/);
  });
});

test.describe('if the motion script fails to load', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the hero copy still appears', async ({ page }) => {
    await page.route(/\/motion\.[\w-]+\.js$/, (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-ok/);
    await expect(page.locator('[data-hero-copy]')).toHaveCSS('opacity', '1', { timeout: 4000 });
  });
});
