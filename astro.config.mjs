// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// Static output. The enquiry route (step 9) will opt out of prerendering and
// needs a server adapter; hosting is undecided, so no adapter is set yet.
export default defineConfig({
  output: 'static',
  // Current SAEL domain (from v5). Used for canonical URLs and the sitemap; revisit when hosting is set up.
  site: 'https://saelenergy.com',
  trailingSlash: 'ignore',

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
