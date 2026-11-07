import { z } from 'astro/zod';

const rupees = z.number().int().nonnegative().max(10_000_000);

/**
 * One central slab: every kW from `fromKw` up to `toKw` earns `perKw`.
 * PM Surya Ghar today: 0–2 kW at ₹30,000/kW, 2–3 kW at ₹18,000/kW.
 */
export const slabSchema = z
  .object({
    fromKw: z.number().nonnegative(),
    toKw: z.number().positive(),
    perKw: rupees,
  })
  .refine((s) => s.toKw > s.fromKw, { message: 'toKw must be greater than fromKw' });

/**
 * A state top-up paid on top of the central subsidy.
 * - perKw: rupees per kW (leave out for a note-only state, which adds nothing to the total)
 * - capKw: the top-up stops at this many kW
 * - cap: rupee ceiling for the top-up
 * - note: shown under the result
 */
export const stateRuleSchema = z
  .object({
    id: z.string().regex(/^[A-Z]{2}$/, 'Two capital letters, e.g. KA'),
    name: z.string().min(1).max(40),
    perKw: rupees.optional(),
    capKw: z.number().positive().optional(),
    cap: rupees.optional(),
    note: z.string().max(240).optional(),
  })
  .refine((s) => s.perKw !== undefined || (s.capKw === undefined && s.cap === undefined), {
    message: 'capKw and cap only apply when perKw is set',
  });

export const subsidySchema = z
  .object({
    central: z.object({
      name: z.string().min(1),
      slabs: z.array(slabSchema).min(1),
      cap: rupees,
    }),
    /** Used when the visitor's state is not in the list. Must match one of the state ids. */
    fallbackStateId: z.string().regex(/^[A-Z]{2}$/),
    defaultStateId: z.string().regex(/^[A-Z]{2}$/),
    states: z.array(stateRuleSchema).min(1),
  })
  .superRefine((rules, ctx) => {
    rules.central.slabs.forEach((slab, i) => {
      const prev = rules.central.slabs[i - 1];
      if (prev && slab.fromKw !== prev.toKw) {
        ctx.addIssue({
          code: 'custom',
          path: ['central', 'slabs', i, 'fromKw'],
          message: `Slabs must follow on: this one should start at ${prev.toKw} kW`,
        });
      }
    });
    const ids = rules.states.map((s) => s.id);
    ids.forEach((id, i) => {
      if (ids.indexOf(id) !== i) {
        ctx.addIssue({
          code: 'custom',
          path: ['states', i, 'id'],
          message: `Duplicate state ${id}`,
        });
      }
    });
    for (const key of ['fallbackStateId', 'defaultStateId'] as const) {
      if (!ids.includes(rules[key])) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${rules[key]} is not in the states list`,
        });
      }
    }
  });

export type SubsidyRules = z.infer<typeof subsidySchema>;
export type StateRule = z.infer<typeof stateRuleSchema>;
export type Slab = z.infer<typeof slabSchema>;
