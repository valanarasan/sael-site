import { z } from 'astro/zod';
import type { ImageField } from './common';

/** Blog topics, in the order the filter buttons show them. */
export const BLOG_TOPICS = [
  'Subsidy & schemes',
  'Solar basics',
  'Monsoon',
  'Performance',
  'O&M & AMC',
] as const;
export type BlogTopic = (typeof BLOG_TOPICS)[number];

/**
 * Front matter of one article (src/content/blog/<slug>.md; the file name is the URL slug).
 * Drafts show as "Article coming soon" cards. Publishing needs a description and a date.
 */
export const blogSchema = (image: ImageField) =>
  z
    .object({
      title: z.string().min(5).max(110),
      description: z.string().min(50).max(170).optional(),
      topic: z.enum(BLOG_TOPICS),
      /** Position among the "coming soon" cards of the same topic (1 first). Published posts sort by date. */
      order: z.number().int().min(1).max(99).optional(),
      cover: image(),
      coverAlt: z.string().min(3).max(200),
      publishDate: z.coerce.date().optional(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().max(60).optional(),
      draft: z.boolean().default(true),
    })
    .superRefine((post, ctx) => {
      if (post.draft) return;
      if (!post.description) {
        ctx.addIssue({
          code: 'custom',
          path: ['description'],
          message: 'Add a description (50–170 characters) before publishing',
        });
      }
      if (!post.publishDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['publishDate'],
          message: 'Add a publish date before publishing',
        });
      }
      if (post.publishDate && post.updatedDate && post.updatedDate < post.publishDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['updatedDate'],
          message: 'The updated date cannot be before the publish date',
        });
      }
    });

export type BlogPostData = z.infer<ReturnType<typeof blogSchema>>;
