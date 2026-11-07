import { z } from 'astro/zod';
import type { ImageField } from './common';

/**
 * One project, one JSON file in src/content/projects.
 * layout: "feature" is the large card, "card" a card with a photo, "mini" a one-line figure.
 * Projects must be in South India (client decision); never add the removed 24/200/20 MW figures.
 */
export const projectSchema = (image: ImageField) =>
  z
    .object({
      title: z.string().min(1).max(80),
      /** e.g. "4.5 MW". Leave out when the size isn't public. */
      size: z.string().max(20).optional(),
      /** e.g. "solar", "Rooftop & ground-mount", "power facilitation" */
      kind: z.string().min(1).max(60),
      /** e.g. "Karnataka" or "Tamil Nadu · Karnataka · Kerala" */
      location: z.string().max(80).optional(),
      year: z.number().int().min(2000).max(2100).optional(),
      summary: z.string().max(240).optional(),
      image: image().optional(),
      alt: z.string().min(3).max(200).optional(),
      credit: z.string().max(80).optional(),
      layout: z.enum(['feature', 'card', 'mini']),
      /** Lower numbers come first. */
      order: z.number().int().default(100),
      draft: z.boolean().default(false),
    })
    .refine((p) => !p.image || Boolean(p.alt), {
      message: 'A project photo needs alt text',
      path: ['alt'],
    });

export type Project = z.infer<ReturnType<typeof projectSchema>>;
