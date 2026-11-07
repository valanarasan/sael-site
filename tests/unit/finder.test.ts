import { describe, expect, it } from 'vitest';
import { cutsQuestionApplies, DEFAULT_ANSWERS, recommendSystem } from '../../src/lib/finder';

describe('recommendSystem', () => {
  it.each([
    [{ grid: 'yes', cuts: 'rare' }, 'onGrid'],
    [{ grid: 'yes', cuts: 'often' }, 'hybrid'],
    [{ grid: 'no', cuts: 'rare' }, 'offGrid'],
    [{ grid: 'no', cuts: 'often' }, 'offGrid'],
  ] as const)('%o -> %s', (answers, expected) => {
    expect(recommendSystem(answers)).toBe(expected);
  });

  it('suggests on-grid for the default answers, as v5 does on load', () => {
    expect(recommendSystem(DEFAULT_ANSWERS)).toBe('onGrid');
  });
});

describe('cutsQuestionApplies', () => {
  it('only with a grid connection', () => {
    expect(cutsQuestionApplies({ grid: 'yes' })).toBe(true);
    expect(cutsQuestionApplies({ grid: 'no' })).toBe(false);
  });
});
