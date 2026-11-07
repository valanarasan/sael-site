import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SAEL/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('home page has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expectNoSeriousA11yViolations(page);
});
