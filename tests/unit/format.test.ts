import { describe, expect, it } from 'vitest';
import { formatDate, formatInr, isoDate } from '../../src/lib/format';

describe('formatInr', () => {
  it.each([
    [0, '₹0'],
    [18000, '₹18,000'],
    [78000, '₹78,000'],
    [108000, '₹1,08,000'],
    [1234567, '₹12,34,567'],
    [29999.6, '₹30,000'],
  ])('%d -> %s', (amount, expected) => {
    expect(formatInr(amount)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('formats as "5 Nov 2026"', () => {
    expect(formatDate(new Date('2026-11-05T10:00:00+05:30'))).toBe('5 Nov 2026');
  });

  it('uses India time, so a late-UTC timestamp lands on the Indian date', () => {
    // 20:00 UTC on 4 Nov is 01:30 IST on 5 Nov.
    expect(formatDate(new Date('2026-11-04T20:00:00Z'))).toBe('5 Nov 2026');
  });
});

describe('isoDate', () => {
  it('gives the India date in YYYY-MM-DD form', () => {
    expect(isoDate(new Date('2026-11-04T20:00:00Z'))).toBe('2026-11-05');
    expect(isoDate(new Date('2026-01-09T12:00:00+05:30'))).toBe('2026-01-09');
  });
});
