import { describe, expect, it } from 'vitest';
import { toIslandJson } from '../../src/lib/island-data';

describe('toIslandJson', () => {
  it('round-trips data', () => {
    const data = { a: 1, b: ['₹78,000', 'x'], c: { d: null } };
    expect(JSON.parse(toIslandJson(data))).toEqual(data);
  });

  it('cannot close the script tag or open markup', () => {
    const out = toIslandJson({ note: '</script><script>alert(1)</script> & <!--' });
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out).note).toBe('</script><script>alert(1)</script> & <!--');
  });

  it('escapes line and paragraph separators', () => {
    const out = toIslandJson({ s: 'a b c' });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
    expect(JSON.parse(out).s).toBe('a b c');
  });
});
