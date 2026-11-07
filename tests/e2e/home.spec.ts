import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

test.describe('home page sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has one h1 and the sections in v5 order', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    const ids = await page
      .locator('main section')
      .evaluateAll((els) =>
        els
          .filter((el) => !el.parentElement?.closest('section'))
          .map((el) => el.id || el.getAttribute('aria-label')),
      );
    expect(ids).toEqual([
      'home',
      'What every SAEL installation includes',
      'systems',
      'subsidy',
      'process',
      'capabilities',
      'engineering',
      'gallery',
      'SAEL in numbers',
      'work',
      'audience',
      'faq',
      'contact',
      'compare',
    ]);
  });

  test('numbers the section eyebrows 01 to 11', async ({ page }) => {
    const numbers = await page.locator('main section .lbl > b').allTextContents();
    expect(numbers.filter((n) => /^\d{2}$/.test(n))).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
    ]);
  });

  test('every image has alt text and a size, and only the first hero image loads eagerly', async ({
    page,
  }) => {
    // Marquee copies are hidden from screen readers and have empty alt text on purpose.
    const imgs = await page.locator('main img').evaluateAll((els) =>
      els
        .filter((img) => !img.closest('[aria-hidden="true"]'))
        .map((img) => ({
          alt: img.getAttribute('alt'),
          width: img.getAttribute('width'),
          height: img.getAttribute('height'),
          loading: img.getAttribute('loading'),
          priority: img.getAttribute('fetchpriority'),
        })),
    );
    expect(imgs.length).toBeGreaterThan(20);
    for (const img of imgs) {
      expect(img.alt?.length ?? 0).toBeGreaterThan(2);
      expect(Number(img.width)).toBeGreaterThan(0);
      expect(Number(img.height)).toBeGreaterThan(0);
    }
    expect(imgs.filter((i) => i.priority === 'high')).toHaveLength(1);
    expect(imgs[0]?.priority).toBe('high');
    expect(imgs.slice(1).every((i) => i.loading === 'lazy')).toBe(true);
  });

  test('serves AVIF and WebP sources for photos', async ({ page }) => {
    const types = await page
      .locator('main picture source')
      .evaluateAll((els) => [...new Set(els.map((s) => s.getAttribute('type')))]);
    expect(types.sort()).toEqual(['image/avif', 'image/webp']);
  });

  test('keeps placeholder content visibly marked', async ({ page }) => {
    await expect(page.getByText('Content from SAEL', { exact: true }).first()).toBeVisible();
    expect(
      await page.getByText('Figure from SAEL', { exact: true }).count(),
    ).toBeGreaterThanOrEqual(5);
  });

  test('never shows removed products or figures', async ({ page }) => {
    const text = (await page.locator('main').innerText()).toLowerCase();
    for (const banned of [
      '24 mw',
      '200 mw',
      '20 mw solar',
      'ghana',
      'water heater',
      'atta chakki',
    ]) {
      expect(text, banned).not.toContain(banned);
    }
  });

  test('shows the default subsidy estimate: 3 kW, ₹78,000', async ({ page }) => {
    const calc = page.locator('[data-calculator]');
    await expect(calc.locator('[data-kw-value]')).toHaveText('3');
    await expect(calc.locator('[data-total]')).toHaveText('₹78,000');
    await expect(page.getByLabel(/system size/i)).toHaveValue('3');
  });

  test('FAQ opens one answer at a time', async ({ page }) => {
    const items = page.locator('#faq details');
    await expect(items.first()).toHaveAttribute('open', '');
    await items.nth(2).locator('summary').click();
    await expect(items.nth(2)).toHaveAttribute('open', '');
    await expect(items.first()).not.toHaveAttribute('open', '');
  });

  test('has no horizontal scroll', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('has no serious accessibility violations', async ({ page }) => {
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('who it is for tabs', () => {
  test('switch with click and with the arrow, Home and End keys', async ({ page }) => {
    await page.goto('/');
    const tabs = page.getByRole('tablist', { name: 'Audience' }).getByRole('tab');
    const panel = (i: number) => page.locator(`#aud-panel-${i}`);

    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(panel(0)).toBeVisible();
    await expect(panel(1)).toBeHidden();

    await tabs.nth(2).click();
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect(panel(2)).toBeVisible();
    await expect(panel(0)).toBeHidden();

    await tabs.nth(2).press('ArrowDown');
    await expect(tabs.nth(3)).toBeFocused();
    await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');

    await tabs.nth(3).press('ArrowDown');
    await expect(tabs.nth(0)).toBeFocused();

    await tabs.nth(0).press('End');
    await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
    await tabs.nth(3).press('Home');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('mobile action bar', () => {
  test('slides away over the contact section', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) > 860, 'phone only');
    await page.goto('/');
    const bar = page.locator('[data-mbar]');
    await expect(bar).not.toHaveClass(/away/);
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await expect(bar).toHaveClass(/away/);
  });
});
