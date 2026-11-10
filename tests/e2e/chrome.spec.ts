import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) <= 860;

test.describe('menu sheet', () => {
  test('opens from the Menu button, traps focus and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Menu' });
    const dialog = page.getByRole('dialog', { name: 'Menu' });

    await expect(dialog).toBeHidden();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await menuButton.click();
    await expect(dialog).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: /Close/ })).toBeFocused();
    await expect(dialog.getByRole('link', { name: /How it works/ })).toBeVisible();
    await expect(dialog.locator('a[href^="tel:+"]')).toHaveCount(1);
    await expect(dialog.locator('a[href^="mailto:"]')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toBeFocused();
  });

  test('closes with the Close button', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: /Close/ }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
  });

  test('closes when a link is followed', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await dialog.getByRole('link', { name: /FAQs/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/#faq$/);
  });

  test('closes instantly with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden({ timeout: 200 });
  });

  test('has no serious accessibility violations while open', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
    await page.waitForTimeout(900); // let the slide-in finish so contrast is measured on the final state
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('header', () => {
  test('the skip link is the first thing keyboard users reach', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
  });

  test('shows the main nav on desktop only', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    if (isMobile(page)) await expect(nav).toBeHidden();
    else await expect(nav.getByRole('link')).toHaveCount(5);
  });

  test('turns solid after scrolling', async ({ page }) => {
    await page.goto('/');
    const bar = page.locator('[data-top-bar]');
    await expect(bar).not.toHaveClass(/solid/);
    await page.mouse.wheel(0, 300);
    await expect(bar).toHaveClass(/solid/);
  });

  // It reads the scroll position one frame after load (reading it during load forced a full
  // layout), so check the background is still right when the page opens part-way down.
  test('is solid when the page opens part-way down', async ({ page }) => {
    await page.goto('/#faq');
    await expect(page.locator('[data-top-bar]')).toHaveClass(/solid/);
  });
});

test.describe('mobile action bar', () => {
  test('shows Call and the survey CTA on phones only', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByRole('navigation', { name: 'Quick contact' });
    if (!isMobile(page)) {
      await expect(bar).toBeHidden();
      return;
    }
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Call' })).toHaveAttribute('href', /^tel:\+\d+$/);
    await expect(bar.getByRole('link', { name: /survey/i })).toHaveAttribute('href', '/#contact');
  });

  test('slides away when the footer is on screen', async ({ page }) => {
    test.skip(!isMobile(page), 'phone only');
    await page.goto('/');
    const bar = page.locator('[data-mbar]');
    await expect(bar).not.toHaveClass(/away/);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(bar).toHaveClass(/away/);
  });
});

test.describe('footer', () => {
  test('lists offices with working tel and mailto links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('heading', { name: 'Offices' })).toBeVisible();
    expect(await footer.locator('a[href^="tel:+"]').count()).toBeGreaterThan(0);
    expect(await footer.locator('a[href^="mailto:"]').count()).toBeGreaterThan(0);
  });
});
