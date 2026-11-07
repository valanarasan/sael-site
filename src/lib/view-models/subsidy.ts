/** Display adapters for subsidy rules. The maths itself lives in lib/subsidy.ts (step 4). */
import { formatInr } from '../format';
import type { Slab, SubsidyRules } from '../schemas/subsidy';
import { calculateSubsidy } from '../subsidy';

export interface SlabRow {
  label: string;
  value: string;
}

const ordinal = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};

function slabLabel({ fromKw, toKw }: Slab): string {
  if (fromKw === 0) return `First ${toKw} kW`;
  if (toKw - fromKw === 1) return `${ordinal(toKw)} kW`;
  return `${fromKw}–${toKw} kW`;
}

function slabValue({ fromKw, toKw, perKw }: Slab): string {
  return toKw - fromKw === 1 ? formatInr(perKw) : `${formatInr(perKw)} / kW`;
}

/**
 * The slab list shown beside the calculator, e.g.
 * First 2 kW · ₹30,000 / kW — 3rd kW · ₹18,000 — Maximum · 3 kW and above · ₹78,000.
 */
export function toSlabRows(rules: SubsidyRules): SlabRow[] {
  const { slabs, cap } = rules.central;
  const lastKw = slabs.at(-1)?.toKw ?? 0;
  return [
    ...slabs.map((slab) => ({ label: slabLabel(slab), value: slabValue(slab) })),
    { label: `Maximum · ${lastKw} kW and above`, value: formatInr(cap) },
  ];
}

export interface StateOption {
  value: string;
  label: string;
  selected: boolean;
}

/** Options for the state dropdown, in file order, with the default state selected. */
export function toStateOptions(rules: SubsidyRules): StateOption[] {
  return rules.states.map((s) => ({
    value: s.id,
    label: s.name,
    selected: s.id === rules.defaultStateId,
  }));
}

export interface CalculatorView {
  kw: number;
  /** One row per central slab: label and the amount it pays at this size. */
  slabRows: { label: string; value: string; dim: boolean }[];
  /** `name` is the state's name; left out for "Other states" and unknown ids. */
  state: { value: string; dim: boolean; name?: string };
  total: { value: string; combined: boolean };
  note?: string;
}

/**
 * The calculator's numbers for a size and state, formatted for display. The island (step 6)
 * recomputes this in the browser on every change; the page renders the default server-side.
 */
export function toCalculatorView(kw: number, stateId: string, rules: SubsidyRules): CalculatorView {
  const result = calculateSubsidy(kw, stateId, rules);
  const slabRows = rules.central.slabs.map((slab) => {
    const kwInSlab = Math.min(Math.max(kw - slab.fromKw, 0), slab.toKw - slab.fromKw);
    const amount = Math.round(kwInSlab * slab.perKw);
    return { label: slabLabel(slab), value: amount ? formatInr(amount) : '—', dim: amount === 0 };
  });
  const id = stateId.trim().toUpperCase();
  const named = rules.states.find((s) => s.id === id && s.id !== rules.fallbackStateId);
  return {
    kw,
    slabRows,
    state: {
      value: result.state ? `+ ${formatInr(result.state)}` : '—',
      dim: result.state === 0,
      ...(named ? { name: named.name } : {}),
    },
    total: { value: formatInr(result.total), combined: result.state > 0 },
    ...(result.note ? { note: result.note } : {}),
  };
}
