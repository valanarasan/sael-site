import { describe, expect, it } from 'vitest';
import { toSlabRows, toStateOptions } from '../../src/lib/view-models/subsidy';
import { subsidyFixture } from '../fixtures/content';

describe('toSlabRows', () => {
  it('describes each slab and the cap', () => {
    expect(toSlabRows(subsidyFixture)).toEqual([
      { label: 'First 2 kW', value: '₹20,000 / kW' },
      { label: '3rd kW', value: '₹10,000' },
      { label: 'Maximum · 3 kW and above', value: '₹50,000' },
    ]);
  });

  it('labels wider middle slabs as a range', () => {
    const rules = {
      ...subsidyFixture,
      central: {
        ...subsidyFixture.central,
        slabs: [
          { fromKw: 0, toKw: 1, perKw: 1000 },
          { fromKw: 1, toKw: 2, perKw: 900 },
          { fromKw: 2, toKw: 5, perKw: 800 },
          { fromKw: 5, toKw: 11, perKw: 700 },
          { fromKw: 11, toKw: 12, perKw: 600 },
          { fromKw: 12, toKw: 22, perKw: 500 },
          { fromKw: 22, toKw: 23, perKw: 400 },
        ],
      },
    };
    expect(toSlabRows(rules).map((r) => r.label)).toEqual([
      'First 1 kW',
      '2nd kW',
      '2–5 kW',
      '5–11 kW',
      '12th kW',
      '12–22 kW',
      '23rd kW',
      'Maximum · 23 kW and above',
    ]);
  });

  it('uses lakh grouping for large amounts', () => {
    const rules = { ...subsidyFixture, central: { ...subsidyFixture.central, cap: 150000 } };
    expect(toSlabRows(rules).at(-1)?.value).toBe('₹1,50,000');
  });
});

describe('toStateOptions', () => {
  it('lists states in file order with the default selected', () => {
    expect(toStateOptions(subsidyFixture)).toEqual([
      { value: 'AA', label: 'Alpha', selected: true },
      { value: 'BB', label: 'Beta', selected: false },
      { value: 'ZZ', label: 'Other states', selected: false },
    ]);
  });
});
