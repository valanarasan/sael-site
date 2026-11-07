import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

// Runs against the production build. Every article is still a draft, so /blog lists 14
// "coming soon" cards and no article pages exist yet; the article template is covered by the
// component tests until SAEL publishes the first post.

test.describe('/blog', () => {
  test('lists the 14 articles under the page heading, drafts without links', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Solar, explained/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Solar, explained.');
    const cards = page.locator('[data-post-card]');
    await expect(cards).toHaveCount(14);
    await expect(cards.getByRole('heading', { level: 2 })).toHaveCount(14);
    await expect(cards.locator('a')).toHaveCount(0);
    await expect(cards.first()).toContainText('Article coming soon');
  });

  test('marks Blog as the current page in the header', async ({ page }) => {
    await page.goto('/blog');
    const nav = page.getByRole('navigation', { name: 'Main' });
    test.skip(!(await nav.isVisible()), 'header links are desktop only');
    await expect(nav.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page');
  });

  test('filters by topic and announces how many articles show', async ({ page }) => {
    await page.goto('/blog');
    const grid = page.locator('[data-blog-grid]');
    await expect(grid).toHaveAttribute('data-ready', 'true');
    const filters = page.getByRole('group', { name: 'Filter articles' });
    const cards = page.locator('[data-post-card]');

    await filters.getByRole('button', { name: 'Monsoon' }).click();
    await expect(filters.getByRole('button', { name: 'Monsoon' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(filters.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(cards.filter({ visible: true })).toHaveCount(2);
    for (const topic of await cards.filter({ visible: true }).locator('.bp-c').allTextContents())
      expect(topic).toBe('Monsoon');
    await expect(page.locator('[data-blog-status]')).toHaveText('Showing 2 articles');

    await filters.getByRole('button', { name: 'All' }).click();
    await expect(cards.filter({ visible: true })).toHaveCount(14);
    await expect(page.locator('[data-blog-status]')).toHaveText('Showing 14 articles');
  });

  test('works from the keyboard', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('[data-blog-grid]')).toHaveAttribute('data-ready', 'true');
    const performance = page.getByRole('button', { name: 'Performance' });
    await performance.focus();
    await page.keyboard.press('Enter');
    await expect(performance).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-post-card]').filter({ visible: true })).toHaveCount(4);
  });

  test('a link to a hidden card clears the filter (chat links drafts as /blog#slug)', async ({
    page,
  }) => {
    await page.goto('/blog');
    await expect(page.locator('[data-blog-grid]')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: 'Monsoon' }).click();
    await expect(page.locator('#om-amc')).toBeHidden();
    await page.evaluate(() => (location.hash = 'om-amc'));
    await expect(page.locator('#om-amc')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('has a share image and points to the RSS feed', async ({ page }) => {
    await page.goto('/blog');
    const image = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(image).toMatch(/^https:\/\/.+\.jpg$/);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
      'href',
      '/rss.xml',
    );
    // The share image itself is served at 1200 × 630.
    const path = new URL(image ?? '').pathname;
    const size = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return [img.naturalWidth, img.naturalHeight];
    }, path);
    expect(size).toEqual([1200, 630]);
  });

  test('has no serious accessibility issues', async ({ page }) => {
    await page.goto('/blog');
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('articles', () => {
  test('drafts have no page in the production build', async ({ page }) => {
    const response = await page.goto('/blog/om-amc');
    expect(response?.status()).toBe(404);
  });
});

test.describe('/rss.xml', () => {
  test('is a valid RSS feed that lists no drafts', async ({ request }) => {
    const response = await request.get('/rss.xml');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('xml');
    const xml = await response.text();
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<title>SAEL Blog · Solar, explained</title>');
    expect(xml).toMatch(/<link>https:\/\/[^<]+\/blog<\/link>/);
    expect(xml).not.toContain('<item>');
  });
});
