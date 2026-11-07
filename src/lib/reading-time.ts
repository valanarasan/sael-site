/** Reading time for a Markdown article. Pure, so cards, article pages and tests agree. */

const WORDS_PER_MINUTE = 200;

/** Counts the words a reader sees: code, images, link targets and Markdown symbols left out. */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/^---[\s\S]*?^---/m, ' ') // front matter, if passed the whole file
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/<!--[\s\S]*?-->/g, ' ') // comments
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep their text
    .replace(/<[^>]+>/g, ' ') // inline HTML tags
    .replace(/[#>*_`~|-]+/g, ' ');
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Whole minutes, at least 1. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(countWords(markdown) / WORDS_PER_MINUTE));
}
