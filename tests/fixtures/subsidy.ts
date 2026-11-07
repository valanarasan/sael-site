import type { SubsidyRules } from '../../src/lib/schemas/subsidy';

/**
 * The rules as specified in CLAUDE.md, kept as a fixture so a SAEL edit to subsidy.json can't
 * change what these tests expect. If the spec changes, change this file and CLAUDE.md together.
 */
export const specRules: SubsidyRules = {
  central: {
    name: 'PM Surya Ghar',
    slabs: [
      { fromKw: 0, toKw: 2, perKw: 30000 },
      { fromKw: 2, toKw: 3, perKw: 18000 },
    ],
    cap: 78000,
  },
  defaultStateId: 'KA',
  fallbackStateId: 'XX',
  states: [
    { id: 'KA', name: 'Karnataka', note: 'Karnataka: central subsidy only.' },
    { id: 'KL', name: 'Kerala', note: 'Kerala: central subsidy only.' },
    {
      id: 'TN',
      name: 'Tamil Nadu',
      note: 'Up to ₹1 lakh announced; guidelines awaited, so not counted.',
    },
    { id: 'UP', name: 'Uttar Pradesh', perKw: 15000, cap: 30000, note: 'UP adds ₹15,000/kW.' },
    { id: 'DL', name: 'Delhi', perKw: 10000, capKw: 3, note: 'Delhi adds ₹10,000/kW to 3 kW.' },
    { id: 'GA', name: 'Goa', note: 'Set by GEDA.' },
    { id: 'XX', name: 'Other states', note: 'Ask us about your state.' },
  ],
};
