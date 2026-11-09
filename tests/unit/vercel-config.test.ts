// vercel.json can't import server/security-headers.mjs, so this keeps the two lists the same.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../../server/security-headers.mjs';

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[];
}

const config = JSON.parse(
  readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
) as VercelConfig;
const [rule] = config.headers;
const sent = Object.fromEntries((rule?.headers ?? []).map(({ key, value }) => [key, value]));

describe('vercel.json', () => {
  it('applies its headers to every address', () => {
    expect(config.headers).toHaveLength(1);
    expect(rule?.source).toBe('/(.*)');
  });

  it('sends every security header the Node server sends', () => {
    expect(sent).toMatchObject(SECURITY_HEADERS);
  });

  it('keeps the test site out of search results', () => {
    expect(sent['X-Robots-Tag']).toBe('noindex, nofollow');
  });
});
