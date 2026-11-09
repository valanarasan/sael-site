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

  // These check the effects themselves, as on a return visit. The loader has its own tests below.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('sael-loader-seen', '1'));
  });

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
    const poster = page.locator('#contact .bg img');
    await expect(poster).toBeVisible();
    await expect
      .poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
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

  test('the loader still gets out of the way', async ({ page }) => {
    await page.route(/\/motion\.[\w-]+\.js$/, (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('[data-loader]')).toBeVisible();
    await expect(page.locator('[data-loader]')).toBeHidden({ timeout: 4000 });
  });

  test('a script arriving after that does not bring the loader back', async ({ page }) => {
    await page.route(/\/motion\.[\w-]+\.js$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3500));
      await route.continue();
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-on/, { timeout: 6000 });
    await expect(page.locator('html')).not.toHaveClass(/loader-on/);
    await expect(page.locator('[data-loader]')).toBeHidden();
    await expect(page.locator('[data-hero-copy]')).toHaveCSS('opacity', '1');
  });
});

test.describe('the opening loader', () => {
  test.use({ reducedMotion: 'no-preference' });
  const loader = (page: Page) => page.locator('[data-loader]');

  test('plays on the first home visit, then reveals the hero', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(loader(page)).toBeVisible();
    await expect(page.locator('[data-loader-count]')).toHaveText('100', { timeout: 4000 });
    await expect(loader(page)).toBeHidden({ timeout: 4000 });
    await expect(page.locator('[data-hero]')).toHaveClass(/intro-done/, { timeout: 6000 });
    await expect(page.locator('[data-hero-copy]')).toHaveCSS('opacity', '1');
    expect(errors).toEqual([]);
  });

  test('holds scrolling back until the page is revealed', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-on/);
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(loader(page)).toBeHidden({ timeout: 4000 });
    await expect
      .poll(async () => {
        await page.mouse.wheel(0, 500);
        return page.evaluate(() => window.scrollY);
      })
      .toBeGreaterThan(0);
  });

  test('leaves the pinned hero working on desktop', async ({ page }) => {
    test.skip(!isDesktop(page), 'desktop only');
    await page.goto('/');
    await expect(page.locator('[data-hero]')).toHaveClass(/intro-done/, { timeout: 8000 });
    const title = page.locator('[data-hero-title]');
    const first = await title.textContent();
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(80);
    }
    await expect(title).not.toHaveText(first ?? '');
    await expect(page.locator('[data-hero-window]')).toHaveCSS(
      'clip-path',
      /inset\(0px( round 0px)?\)|none/,
    );
  });

  test('does not play again in the same session', async ({ page }) => {
    await page.goto('/');
    await expect(loader(page)).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).not.toHaveClass(/loader-on/);
    await expect(loader(page)).toBeHidden();
    await page.goto('/blog');
    await page.goto('/');
    await expect(loader(page)).toBeHidden();
  });

  test('plays in a new session', async ({ browser, baseURL }) => {
    for (let session = 0; session < 2; session++) {
      const context = await browser.newContext({ reducedMotion: 'no-preference' });
      const page = await context.newPage();
      await page.goto(`${baseURL}/`);
      await expect(page.locator('[data-loader]')).toBeVisible();
      await context.close();
    }
  });

  test('waits for the home page when a visitor lands on the blog first', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('html')).not.toHaveClass(/loader-on/);
    await page.goto('/');
    await expect(loader(page)).toBeVisible();
  });

  test('stays out of the way of someone landing on a section', async ({ page }) => {
    await page.goto('/#contact');
    await expect(page.locator('html')).not.toHaveClass(/loader-on/);
    await expect(loader(page)).toBeHidden();
  });

  test('shows nothing if the browser blocks session storage', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        get: () => {
          throw new DOMException('Blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/motion-ok/);
    await expect(loader(page)).toBeHidden();
  });
});

test.describe('the opening loader never shows', () => {
  test('with reduced motion', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/loader-on/);
    await expect(page.locator('[data-loader]')).toBeHidden();
  });

  test('without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/`);
    await expect(page.locator('[data-loader]')).toBeHidden();
    await expect(page.locator('h1')).toBeVisible();
    await context.close();
  });
});
