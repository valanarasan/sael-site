import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './axe';

/** Scrolls an island into view and waits until its script has started. */
async function hydrate(page: Page, selector: string): Promise<Locator> {
  const root = page.locator(selector).first();
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute('data-ready', 'true');
  return root;
}

test.describe('subsidy calculator', () => {
  test('recomputes from the slider (keyboard) and the state list', async ({ page }) => {
    await page.goto('/');
    const calc = await hydrate(page, '[data-calculator]');
    const slider = calc.getByRole('slider');
    const total = calc.locator('[data-total]');

    // Keyboard: 3 kW -> 1 kW
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveValue('1');
    await expect(slider).toHaveAttribute('aria-valuetext', '1 kW');
    await expect(calc.locator('[data-kw-value]')).toHaveText('1');
    await expect(total).toHaveText('₹30,000');
    await expect(calc.locator('[data-slab-row]').nth(1)).toHaveClass(/dim/);
    await expect(calc.locator('[data-slab-row]').nth(1).locator('dd')).toHaveText('—');

    // CLAUDE.md acceptance case: 3 kW in Uttar Pradesh = ₹78,000 + ₹30,000 = ₹1,08,000
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await calc.getByRole('combobox').selectOption('UP');
    await expect(total).toHaveText('₹1,08,000');
    await expect(calc.locator('[data-total-label]')).toHaveText('Central + state');
    await expect(calc.locator('[data-state-label]')).toHaveText('Uttar Pradesh top-up');
    await expect(calc.locator('[data-state-row] dd')).toHaveText('+ ₹30,000');
    await expect(calc.locator('[data-state-note]')).toContainText('Uttar Pradesh');
    await expect(calc.locator('[data-announce]')).toHaveText('3 kW: Central + state ₹1,08,000');
  });

  test('Tamil Nadu shows its note but adds nothing', async ({ page }) => {
    await page.goto('/');
    const calc = await hydrate(page, '[data-calculator]');
    await calc.getByRole('combobox').selectOption('TN');
    await expect(calc.locator('[data-total]')).toHaveText('₹78,000');
    await expect(calc.locator('[data-state-row]')).toHaveClass(/dim/);
    await expect(calc.locator('[data-state-note]')).toContainText('guidelines');
  });
});

test.describe('system finder', () => {
  test('suggests off-grid without a grid and hybrid with frequent cuts', async ({ page }) => {
    await page.goto('/');
    const finder = await hydrate(page, '[data-finder]');
    const name = finder.locator('[data-result-name]');
    const gridNo = finder.getByRole('button', { name: 'No', exact: true });
    const gridYes = finder.getByRole('button', { name: 'Yes', exact: true });
    const often = finder.getByRole('button', { name: 'Often', exact: true });

    await gridNo.click();
    await expect(gridNo).toHaveAttribute('aria-pressed', 'true');
    await expect(gridYes).toHaveAttribute('aria-pressed', 'false');
    await expect(name).toHaveText('Off-grid');
    await expect(often).toBeDisabled();
    await expect(page.locator('#systems [role="columnheader"][data-system="offGrid"]')).toHaveClass(
      /pick/,
    );
    await expect(
      page.locator('#systems [role="columnheader"][data-system="onGrid"]'),
    ).not.toHaveClass(/pick/);

    await gridYes.click();
    await expect(often).toBeEnabled();
    await often.click();
    await expect(name).toHaveText('Hybrid');
    await expect(page.locator('#systems [role="columnheader"][data-system="hybrid"]')).toHaveClass(
      /pick/,
    );
  });

  test('works with the keyboard', async ({ page }) => {
    await page.goto('/');
    const finder = await hydrate(page, '[data-finder]');
    await finder.getByRole('button', { name: 'Often', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(finder.locator('[data-result-name]')).toHaveText('Hybrid');
  });
});

test.describe('gallery', () => {
  test('next button scrolls the row', async ({ page }) => {
    await page.goto('/');
    const gallery = await hydrate(page, '[data-gallery-root]');
    const track = gallery.locator('[data-gallery]');
    expect(await track.evaluate((el) => el.scrollLeft)).toBe(0);
    await gallery.getByRole('button', { name: 'Next photos' }).click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await gallery.getByRole('button', { name: 'Previous photos' }).click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(10);
  });

  test('opens the viewer, moves with arrow keys and returns focus on Escape', async ({ page }) => {
    await page.goto('/');
    const gallery = await hydrate(page, '[data-gallery-root]');
    const opener = gallery.getByRole('button', { name: 'Open photo: Elevated array' });
    const viewer = page.getByRole('dialog', { name: 'Photo viewer' });

    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(viewer).toBeVisible();
    await expect(viewer.locator('[data-viewer-title]')).toHaveText('Elevated array');
    await expect(viewer.locator('[data-viewer-credit]')).toHaveText(
      'Photo · SAEL · SAEL installation',
    );
    await expect(viewer.locator('img')).toHaveAttribute('alt', /elevated/i);

    await page.keyboard.press('ArrowRight');
    await expect(viewer.locator('[data-viewer-title]')).toHaveText('Tiled-roof villa');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(viewer.locator('[data-viewer-title]')).toHaveText('Bengaluru rooftop');

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('viewer buttons work and it passes axe', async ({ page }) => {
    await page.goto('/');
    const gallery = await hydrate(page, '[data-gallery-root]');
    await gallery.getByRole('button', { name: 'Open photo: Chennai rooftop' }).click();
    const viewer = page.getByRole('dialog', { name: 'Photo viewer' });
    await viewer.getByRole('button', { name: 'Next photo' }).click();
    await expect(viewer.locator('[data-viewer-title]')).toHaveText('Garden home');
    await expectNoSeriousA11yViolations(page);
    await viewer.getByRole('button', { name: 'Close' }).click();
    await expect(viewer).toBeHidden();
  });
});

test.describe('chat assistant', () => {
  test('loads its code and data only when opened', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto('/');
    await hydrate(page, '[data-chat]');
    expect(requests.some((u) => u.includes('chat-data.json'))).toBe(false);
    await page.getByRole('button', { name: 'Ask SAEL' }).click();
    await expect.poll(() => requests.some((u) => u.includes('chat-data.json'))).toBe(true);
  });

  test('opens with a greeting, answers questions and hands off to WhatsApp', async ({ page }) => {
    await page.goto('/');
    await hydrate(page, '[data-chat]');
    const fab = page.getByRole('button', { name: 'Ask SAEL' });
    const panel = page.getByRole('dialog', { name: 'SAEL Solar Assistant' });
    const log = panel.getByRole('log');
    const input = panel.getByLabel('Type your question');

    await fab.click();
    await expect(panel).toBeVisible();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toBeFocused();
    await expect(log).toContainText("I'm the SAEL solar assistant");

    // Removed products get the polite "not offered" answer.
    await input.fill('Do you sell a solar atta chakki?');
    await input.press('Enter');
    await expect(log.locator('.me').last()).toHaveText('Do you sell a solar atta chakki?');
    await expect(log.locator('.bot').last()).toContainText("don't supply");

    // Chip, then a bare size: the subsidy follow-up.
    await panel.getByRole('button', { name: 'Subsidy amount' }).click();
    await expect(log.locator('.bot').last()).toContainText('PM Surya Ghar');
    await expect(log.locator('.bot').last().getByRole('link', { name: /Read:/ })).toBeVisible();
    await input.fill('3');
    await input.press('Enter');
    await expect(log.locator('.bot').last()).toContainText('₹78,000');

    // Unknown text: fallback with a WhatsApp link carrying the question.
    await input.fill('Can you fix my car?');
    await input.press('Enter');
    const wa = log
      .locator('.bot')
      .last()
      .getByRole('link', { name: /WhatsApp/ });
    await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/\d+\?text=.*fix%20my%20car/);
    await expect(wa).toHaveAttribute('target', '_blank');
    await expect(wa).toHaveAttribute('rel', 'noopener noreferrer');

    // Escape closes and returns focus to the button.
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await expect(fab).toBeFocused();
  });

  test('shows what the visitor typed as text, never as markup', async ({ page }) => {
    await page.goto('/');
    await hydrate(page, '[data-chat]');
    await page.getByRole('button', { name: 'Ask SAEL' }).click();
    const input = page.getByLabel('Type your question');
    await input.fill('<img src=x onerror="window.__pwned=1">');
    await input.press('Enter');
    const mine = page.locator('[data-chat-log] .me').last();
    await expect(mine).toHaveText('<img src=x onerror="window.__pwned=1">');
    await expect(page.locator('[data-chat-log] img')).toHaveCount(0);
    expect(
      await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
    ).toBeUndefined();
  });

  test('passes axe while open', async ({ page }) => {
    await page.goto('/');
    await hydrate(page, '[data-chat]');
    await page.getByRole('button', { name: 'Ask SAEL' }).click();
    await expect(page.getByRole('log')).toContainText('assistant');
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('day/night slider', () => {
  test('moves with the keyboard and reports its value', async ({ page }) => {
    await page.goto('/');
    const root = await hydrate(page, '[data-compare]');
    const handle = root.getByRole('slider', { name: 'Compare day and night' });
    await expect(handle).toHaveAttribute('aria-valuenow', '50');
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect(handle).toHaveAttribute('aria-valuenow', '55');
    await page.keyboard.press('PageDown');
    await expect(handle).toHaveAttribute('aria-valuenow', '45');
    await page.keyboard.press('Home');
    await expect(handle).toHaveAttribute('aria-valuenow', '0');
    await page.keyboard.press('End');
    await expect(handle).toHaveAttribute('aria-valuenow', '100');
    await expect(handle).toHaveAttribute('aria-valuetext', '100%');
    expect(await root.evaluate((el) => el.style.getPropertyValue('--p'))).toBe('100%');
  });

  test('follows a drag', async ({ page }) => {
    await page.goto('/');
    const root = await hydrate(page, '[data-compare]');
    const box = await root.boundingBox();
    if (!box) throw new Error('no slider');
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const value = Number(await root.getByRole('slider').getAttribute('aria-valuenow'));
    expect(value).toBeGreaterThan(15);
    expect(value).toBeLessThan(25);
  });
});
