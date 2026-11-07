import { z } from 'astro/zod';

/** One FAQ. The file is a list; the order in the file is the order on the page. */
export const faqSchema = z.object({
  question: z.string().min(5).max(160),
  answer: z.string().min(10).max(1200),
});

export type Faq = z.infer<typeof faqSchema>;
