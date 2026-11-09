// @ts-check
import node from '@astrojs/node';
import { defineConfig, fontProviders } from 'astro/config';

// Static output: every page is pre-built, except the enquiry endpoint (src/pages/api/enquiry.ts),
// which runs on demand. That one route needs a server adapter. Hosting is undecided, so the
// standalone Node adapter is used for now; switching host means swapping this one adapter.
export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // Current SAEL domain (from v5). Used for canonical URLs and the sitemap; revisit when hosting is set up.
  site: 'https://saelenergy.com',
  trailingSlash: 'ignore',

  // AVIF at 40 rather than the default 50: about 30% smaller for the LCP budget on phones, with
  // only slight softening in fine detail. WebP and JPEG, the fallbacks, keep their defaults.
  image: {
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { quality: 40 } } },
  },

  // Fonts API: files are downloaded at build time and served from the site itself (no font CDN at runtime).
  // Only the weights and styles v5 uses, font-display: swap. latin-ext is included for the
  // rupee sign (U+20B9); browsers only download it on pages that use one of its characters.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Plus Jakarta Sans',
      cssVariable: '--font-jakarta',
      weights: [400, 500, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      weights: [400, 500],
      styles: ['italic'],
      subsets: ['latin'],
      display: 'swap',
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      display: 'swap',
      fallbacks: ['ui-monospace', 'Menlo', 'monospace'],
    },
  ],
});
