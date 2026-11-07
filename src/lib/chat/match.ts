/**
 * Keyword matcher for the chat assistant. Intents are data (chat.json); this only scores them.
 *
 * Matching rules:
 * - Keywords of 3 characters or fewer ("hi", "hp", "amc") must be a whole word.
 * - Longer keywords must start a word, so "clean" matches "cleaning" but "read" no longer matches
 *   "already" and "rate" no longer matches "separate" (both happened in v5).
 * - Keywords longer than 4 characters score 2, shorter ones 1. Highest total wins; ties go to the
 *   intent listed first.
 */
import type { Intent } from '../schemas/chat';

const NOT_WORD_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}])';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const patternCache = new Map<string, RegExp>();

function patternFor(keyword: string): RegExp {
  const cached = patternCache.get(keyword);
  if (cached) return cached;
  const k = keyword.toLowerCase().trim();
  const end = k.length <= 3 ? NOT_WORD_AFTER : '';
  const pattern = new RegExp(`${NOT_WORD_BEFORE}${escapeRegExp(k)}${end}`, 'u');
  patternCache.set(keyword, pattern);
  return pattern;
}

/** Lower-cases, straightens quotes and collapses whitespace. */
export function normaliseQuestion(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

export function keywordMatches(keyword: string, text: string): boolean {
  return patternFor(keyword).test(normaliseQuestion(text));
}

export function scoreIntent(text: string, intent: Pick<Intent, 'keywords'>): number {
  const question = normaliseQuestion(text);
  return intent.keywords.reduce(
    (score, k) => (patternFor(k).test(question) ? score + (k.length > 4 ? 2 : 1) : score),
    0,
  );
}

/** The best-scoring intent, or null when no keyword matches. */
export function matchIntent<T extends Pick<Intent, 'keywords'>>(
  text: string,
  intents: T[],
): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const intent of intents) {
    const score = scoreIntent(text, intent);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best;
}
