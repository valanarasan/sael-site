import { describe, expect, it } from 'vitest';
import { photoWidths } from '../../src/lib/photo';

describe('photoWidths', () => {
  it('never goes above the original', () => {
    expect(photoWidths(1000)).toEqual([480, 800, 1000]);
  });

  it('stops at the maximum when one is given', () => {
    expect(photoWidths(4000, 1200)).toEqual([480, 800, 1200]);
  });

  it('ignores a maximum larger than the original', () => {
    expect(photoWidths(700, 1920)).toEqual([480, 700]);
  });

  it('keeps a small original as its only size', () => {
    expect(photoWidths(300)).toEqual([300]);
  });
});
