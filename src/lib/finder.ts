/** System finder: which system to suggest from two answers. Pure; the island renders it. */

export type SystemKey = 'onGrid' | 'hybrid' | 'offGrid';

export interface FinderAnswers {
  /** Has a grid electricity connection. */
  grid: 'yes' | 'no';
  /** How often the power goes off. Ignored when there is no grid. */
  cuts: 'rare' | 'often';
}

export const DEFAULT_ANSWERS: FinderAnswers = { grid: 'yes', cuts: 'rare' };

/** No grid → off-grid; frequent cuts → hybrid; otherwise on-grid. */
export function recommendSystem({ grid, cuts }: FinderAnswers): SystemKey {
  if (grid === 'no') return 'offGrid';
  return cuts === 'often' ? 'hybrid' : 'onGrid';
}

/** Whether the power-cuts question applies (it doesn't without a grid). */
export const cutsQuestionApplies = ({ grid }: Pick<FinderAnswers, 'grid'>): boolean =>
  grid === 'yes';
