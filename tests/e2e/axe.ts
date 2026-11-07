import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Known exception, kept on purpose until SAEL decides on brand colours (see CLAUDE.md):
 * white text on the v5 copper fill (#E8692E) is 3.23:1, below the 4.5:1 AA minimum.
 * Only the colour-contrast rule is skipped, and only for these elements.
 */
const COPPER_FILLS = ['.mbar .go', '.b-cop'];

type Violation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

const serious = (violations: Violation[]) =>
  violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

/** Fails the test on any serious or critical WCAG 2 A/AA violation. */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const tags = ['wcag2a', 'wcag2aa'];
  const everythingButContrast = await new AxeBuilder({ page })
    .withTags(tags)
    .disableRules(['color-contrast'])
    .analyze();
  // One exclude() per selector: an array passed to exclude() is read as an iframe path.
  const contrast = await COPPER_FILLS.reduce(
    (builder, selector) => builder.exclude(selector),
    new AxeBuilder({ page }).withRules(['color-contrast']),
  ).analyze();

  const found = serious([...everythingButContrast.violations, ...contrast.violations]);
  expect(found, JSON.stringify(found, null, 2)).toEqual([]);
}
