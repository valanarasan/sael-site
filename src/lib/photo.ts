/**
 * Shared photo settings, so a page's preload hint asks for exactly the files its <picture> uses.
 * If they ever differ, the browser downloads the image twice.
 */

const CANDIDATE_WIDTHS = [480, 800, 1200, 1600, 2000, 2560];

/** The widths to generate: never larger than the original or the given maximum. */
export function photoWidths(sourceWidth: number, maxWidth?: number): number[] {
  const limit = Math.min(maxWidth ?? sourceWidth, sourceWidth);
  return [...CANDIDATE_WIDTHS.filter((width) => width < limit), limit];
}

/** First hero photo. On phones the slide is 62vh tall and a 4:3 photo fills it by height. */
export const HERO_PHOTO = {
  sizes: '(max-width: 860px) max(83vh, 100vw), 100vw',
  maxWidth: 2560,
} as const;

/** The large card that opens the blog page. */
export const LEAD_POST_PHOTO = {
  sizes: '(max-width: 640px) calc(100vw - 32px), (max-width: 1020px) 52vw, 40vw',
  maxWidth: 1200,
} as const;
