/**
 * PM Surya Ghar subsidy maths. Pure: no formatting, no DOM. The rates come from subsidy.json
 * (validated by src/lib/schemas/subsidy.ts), so new states or rates are data changes only.
 */
import type { StateRule, SubsidyRules } from './schemas/subsidy';

export interface SubsidyResult {
  /** Central (PM Surya Ghar) subsidy in whole rupees. */
  central: number;
  /** State top-up in whole rupees; 0 for note-only states. */
  state: number;
  total: number;
  /** The state's note, shown under the result. */
  note?: string;
}

/** Central subsidy: each slab pays per kW (pro rata for part kW), then the overall cap applies. */
function centralSubsidy(kw: number, rules: SubsidyRules): number {
  const { slabs, cap } = rules.central;
  const sum = slabs.reduce((total, { fromKw, toKw, perKw }) => {
    const kwInSlab = Math.min(Math.max(kw - fromKw, 0), toKw - fromKw);
    return total + kwInSlab * perKw;
  }, 0);
  return Math.min(sum, cap);
}

/** State top-up: per kW up to an optional kW cap, then an optional rupee cap. Note-only states pay 0. */
function stateTopUp(kw: number, state: StateRule): number {
  if (state.perKw === undefined) return 0;
  const eligibleKw = state.capKw === undefined ? kw : Math.min(kw, state.capKw);
  const amount = eligibleKw * state.perKw;
  return state.cap === undefined ? amount : Math.min(amount, state.cap);
}

/** Finds a state by id (case and spaces ignored), falling back to the "other states" rule. */
function findState(stateId: string, rules: SubsidyRules): StateRule | undefined {
  const id = stateId.trim().toUpperCase();
  return (
    rules.states.find((s) => s.id === id) ??
    rules.states.find((s) => s.id === rules.fallbackStateId)
  );
}

/**
 * Subsidy for a residential rooftop system of `kw` kilowatts in the given state.
 * Throws RangeError for a negative, NaN or infinite size.
 */
export function calculateSubsidy(kw: number, stateId: string, rules: SubsidyRules): SubsidyResult {
  if (!Number.isFinite(kw) || kw < 0) {
    throw new RangeError(`System size must be 0 kW or more, got ${kw}`);
  }

  const state = findState(stateId, rules);
  const central = Math.round(centralSubsidy(kw, rules));
  const top = state ? Math.round(stateTopUp(kw, state)) : 0;

  return {
    central,
    state: top,
    total: central + top,
    ...(state?.note ? { note: state.note } : {}),
  };
}
