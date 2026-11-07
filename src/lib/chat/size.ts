/** Reads a home system size from a chat message, e.g. "3 kW" or a bare "3" after we asked. */

/** The calculator's range; sizes outside it are clamped, as in v5. */
export const MIN_KW = 1;
export const MAX_KW = 10;

/** Bare numbers above this are taken as bills or rupee amounts, not sizes. */
const MAX_BARE_NUMBER = 100;

const NUMBER = String.raw`(\d[\d,]*(?:\.\d+)?)`;
const WITH_UNIT = new RegExp(`${NUMBER}\\s*(?:kw|kilo\\s?watts?)(?![a-z])`, 'i');
const BARE = new RegExp(NUMBER);

const toNumber = (s: string) => Number(s.replace(/,/g, ''));
const clamp = (kw: number) => Math.min(MAX_KW, Math.max(MIN_KW, Math.floor(kw)));

/**
 * The size in whole kW (clamped to 1–10), or null.
 * With `expectingSize` (we just asked for one), a bare number up to 100 also counts.
 */
export function extractKw(text: string, expectingSize: boolean): number | null {
  const withUnit = WITH_UNIT.exec(text);
  if (withUnit?.[1]) return clamp(toNumber(withUnit[1]));
  if (!expectingSize) return null;

  const bare = BARE.exec(text);
  if (!bare?.[1]) return null;
  const n = toNumber(bare[1]);
  return n <= MAX_BARE_NUMBER ? clamp(n) : null;
}
