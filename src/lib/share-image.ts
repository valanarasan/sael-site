/**
 * Link-preview (Open Graph) image settings, shared by the layout's meta tags and the article
 * structured data so both point at the same generated file. JPEG for the widest crawler support.
 */
export const SHARE_IMAGE = {
  width: 1200,
  height: 630,
  fit: 'cover',
  format: 'jpg',
  quality: 80,
} as const;
