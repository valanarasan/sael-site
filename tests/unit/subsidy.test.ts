import { describe, expect, it } from 'vitest';
import { formatInr } from '../../src/lib/format';
import type { SubsidyRules } from '../../src/lib/schemas/subsidy';
import { calculateSubsidy } from '../../src/lib/subsidy';
import { specRules as rules } from '../fixtures/subsidy';

describe('central subsidy, every kW from 1 to 10', () => {
  it.each([
    [1, 30000],
    [2, 60000],
    [3, 78000],
    [4, 78000],
    [5, 78000],
    [6, 78000],
    [7, 78000],
    [8, 78000],
    [9, 78000],
    [10, 78000],
  ])('%i kW -> ₹%i', (kw, central) => {
    const r = calculateSubsidy(kw, 'XX', rules);
    expect(r.central).toBe(central);
    expect(r.state).toBe(0);
    expect(r.total).toBe(central);
  });
});

describe('central slab edges', () => {
  it('pays ₹30,000 per kW up to 2 kW', () => {
    expect(calculateSubsidy(2, 'XX', rules).central).toBe(60000);
  });

  it('adds ₹18,000 for the 3rd kW only', () => {
    expect(
      calculateSubsidy(3, 'XX', rules).central - calculateSubsidy(2, 'XX', rules).central,
    ).toBe(18000);
  });

  it('pays part-kW pro rata within a slab', () => {
    expect(calculateSubsidy(1.5, 'XX', rules).central).toBe(45000);
    expect(calculateSubsidy(2.5, 'XX', rules).central).toBe(69000);
  });

  it('stops at the ₹78,000 cap above 3 kW', () => {
    expect(calculateSubsidy(3.01, 'XX', rules).central).toBe(78000);
    expect(calculateSubsidy(500, 'XX', rules).central).toBe(78000);
  });

  it('applies the cap even if the slabs would add up to more', () => {
    const lowCap: SubsidyRules = { ...rules, central: { ...rules.central, cap: 50000 } };
    expect(calculateSubsidy(2, 'XX', lowCap).central).toBe(50000);
    expect(calculateSubsidy(1, 'XX', lowCap).central).toBe(30000);
  });

  it('gives nothing for 0 kW', () => {
    expect(calculateSubsidy(0, 'UP', rules)).toMatchObject({ central: 0, state: 0, total: 0 });
  });
});

describe('state top-ups', () => {
  it('3 kW in Uttar Pradesh: ₹78,000 + ₹30,000 = ₹1,08,000', () => {
    const r = calculateSubsidy(3, 'UP', rules);
    expect(r).toMatchObject({ central: 78000, state: 30000, total: 108000 });
    expect(formatInr(r.total)).toBe('₹1,08,000');
  });

  it('Uttar Pradesh pays per kW until its rupee cap', () => {
    expect(calculateSubsidy(1, 'UP', rules).state).toBe(15000);
    expect(calculateSubsidy(2, 'UP', rules).state).toBe(30000);
    expect(calculateSubsidy(10, 'UP', rules).state).toBe(30000);
  });

  it('Delhi pays per kW up to its kW cap', () => {
    expect(calculateSubsidy(1, 'DL', rules).state).toBe(10000);
    expect(calculateSubsidy(3, 'DL', rules).state).toBe(30000);
    expect(calculateSubsidy(5, 'DL', rules).state).toBe(30000);
    expect(calculateSubsidy(5, 'DL', rules).total).toBe(108000);
  });

  it('applies both a kW cap and a rupee cap when a state has both', () => {
    const both: SubsidyRules = {
      ...rules,
      states: [...rules.states, { id: 'ZZ', name: 'Both', perKw: 10000, capKw: 3, cap: 25000 }],
    };
    expect(calculateSubsidy(2, 'ZZ', both).state).toBe(20000);
    expect(calculateSubsidy(3, 'ZZ', both).state).toBe(25000);
    expect(calculateSubsidy(6, 'ZZ', both).state).toBe(25000);
  });

  it('Tamil Nadu is note-only until guidelines are issued', () => {
    const r = calculateSubsidy(3, 'TN', rules);
    expect(r.state).toBe(0);
    expect(r.total).toBe(78000);
    expect(r.note).toMatch(/guidelines/);
  });

  it('Goa is note-only', () => {
    expect(calculateSubsidy(3, 'GA', rules)).toMatchObject({ state: 0, note: 'Set by GEDA.' });
  });

  it.each(['KA', 'KL'])('%s has no top-up', (id) => {
    expect(calculateSubsidy(3, id, rules)).toMatchObject({
      central: 78000,
      state: 0,
      total: 78000,
    });
  });

  it('passes the state note through', () => {
    expect(calculateSubsidy(3, 'UP', rules).note).toBe('UP adds ₹15,000/kW.');
  });

  it('leaves the note out when a state has none', () => {
    const noNote: SubsidyRules = { ...rules, states: [{ id: 'XX', name: 'Other states' }] };
    expect(calculateSubsidy(3, 'XX', noNote)).not.toHaveProperty('note');
  });
});

describe('unknown states', () => {
  it('fall back to central only, with the fallback note', () => {
    expect(calculateSubsidy(3, 'QQ', rules)).toEqual({
      central: 78000,
      state: 0,
      total: 78000,
      note: 'Ask us about your state.',
    });
  });

  it('match state ids without regard to case or spaces', () => {
    expect(calculateSubsidy(3, ' up ', rules).state).toBe(30000);
  });
});

describe('invalid sizes', () => {
  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s kW', (kw) => {
    expect(() => calculateSubsidy(kw, 'KA', rules)).toThrow(RangeError);
  });
});

describe('rounding', () => {
  it('returns whole rupees', () => {
    const r = calculateSubsidy(1.0001, 'UP', rules);
    expect(Number.isInteger(r.central)).toBe(true);
    expect(Number.isInteger(r.state)).toBe(true);
    expect(r.total).toBe(r.central + r.state);
  });
});
