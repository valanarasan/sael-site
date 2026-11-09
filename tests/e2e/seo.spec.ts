import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

const INDEXED = ['/', '/blog'];
const NOT_INDEXED = ['/enquiry/sent', '/enquiry/problem'];

test.describe('page details', () => {
  test('each indexed page has its own title and description', async ({ page }) => {
    const seen = { titles: new Set<string>(), descriptions: new Set<string>() };
    for (const path of INDEXED) {
      await page.goto(path);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(title.length, path).toBeGreaterThan(10);
      expect(title.length, path).toBeLessThanOrEqual(70);
      expect(description?.length ?? 0, path).toBeGreaterThanOrEqual(50);
      expect(description?.length ?? 0, path).toBeLessThanOrEqual(170);
      seen.titles.add(title);
      seen.descriptions.add(description ?? '');
    }
    expect(seen.titles.size).toBe(INDEXED.length);
    expect(seen.descriptions.size).toBe(INDEXED.length);
  });

  test('canonical addresses have no trailing slash', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://saelenergy.com/',
    );
    await page.goto('/blog');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://saelenergy.com/blog',
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://saelenergy.com/blog',
    );
  });

  test('every indexed page has a link-preview image', async ({ page }) => {
    for (const path of INDEXED) {
      await page.goto(path);
      const image = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(image, path).toMatch(/^https:\/\/saelenergy\.com\/_astro\/.+\.jpg$/);
    }
  });

  test('pages that are not for search say noindex and name no canonical', async ({ page }) => {
    for (const path of NOT_INDEXED) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'noindex');
      await expect(page.locator('link[rel="canonical"]'), path).toHaveCount(0);
    }
  });

  test('/blog/ redirects to /blog, keeping one address per page', async ({ request }) => {
    const res = await request.get('/blog/', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toBe('/blog');
  });
});

test.describe('structured data', () => {
  const graph = async (page: Page) => {
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    return JSON.parse(raw ?? '{}')['@graph'] as Record<string, unknown>[];
  };

  test('the home page lists the company and its Indian offices', async ({ page }) => {
    await page.goto('/');
    const items = await graph(page);
    const offices = items.filter((item) => item['@type'] === 'LocalBusiness');
    expect(items.filter((item) => item['@type'] === 'Organization')).toHaveLength(1);
    expect(offices.length).toBeGreaterThan(0);
    for (const office of offices) {
      expect(office['url']).toBe('https://saelenergy.com/');
      expect(office['telephone']).toMatch(/^\+\d+$/);
      expect(office['image']).toMatch(/^https:\/\/saelenergy\.com\/_astro\//);
      expect(office['address']).toMatchObject({
        '@type': 'PostalAddress',
        streetAddress: expect.any(String),
        addressLocality: expect.any(String),
        addressRegion: expect.any(String),
        postalCode: expect.any(String),
        addressCountry: expect.any(String),
      });
    }
  });
});

test.describe('sitemap and robots', () => {
  test('robots.txt names the sitemap', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.headers()['content-type']).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('Sitemap: https://saelenergy.com/sitemap.xml');
    expect(text).toContain('Disallow: /api/');
  });

  test('the sitemap lists only real, indexable pages', async ({ request, page }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.headers()['content-type']).toContain('xml');
    const xml = await res.text();
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
    expect(locations).toContain('https://saelenergy.com/');
    expect(locations).toContain('https://saelenergy.com/blog');
    expect(xml).not.toContain('/enquiry');

    for (const location of locations) {
      const { pathname } = new URL(location);
      const response = await page.goto(pathname);
      expect(response?.status(), pathname).toBe(200);
      await expect(page.locator('meta[name="robots"]'), pathname).toHaveCount(0);
    }
  });
});

test.describe('old WordPress addresses', () => {
  const REDIRECTS: Record<string, string> = {
    '/about': '/#capabilities',
    '/who-we-are': '/#capabilities',
    '/contact': '/#contact',
    '/connect-with-us': '/#contact',
    '/solar-roof-top': '/#systems',
    '/epc': '/#process',
    '/om': '/#process',
    '/faqs': '/#faq',
    '/projects': '/#work',
    '/development-support-services': '/',
    '/power-purchase': '/',
    '/legal-disclaimer': '/',
    '/site-map': '/',
  };

  for (const [from, to] of Object.entries(REDIRECTS)) {
    test(`${from} moves permanently to ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(res.headers()['location']).toBe(to);
    });
  }

  test('work with the trailing slash WordPress used', async ({ request }) => {
    const res = await request.get('/about/');
    expect(res.status()).toBe(200);
    expect(res.url()).toMatch(/\/(#capabilities)?$/);
  });

  test('land on the right section', async ({ page }) => {
    await page.goto('/faqs/');
    await expect(page.locator('#faq')).toBeAttached();
    expect(new URL(page.url()).hash).toBe('#faq');
  });
});

test.describe('page not found', () => {
  test('returns 404 with a way back and no index', async ({ page }) => {
    for (const path of ['/no-such-page', '/hello-world', '/sample-page']) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('main').getByRole('link', { name: /^\+91/ })).toHaveAttribute(
      'href',
      /^tel:\+91/,
    );
    await page.getByRole('link', { name: 'Back to the home page' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('passes axe', async ({ page }) => {
    await page.goto('/no-such-page');
    await expectNoSeriousA11yViolations(page);
  });
});
