// @ts-check
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import { defineConfig, fontProviders } from 'astro/config';

// Vercel sets this during its builds. The test site runs there; everything else, tests included,
// stays on Node. See "Deploying" in the README.
const onVercel = Boolean(process.env.VERCEL);

// Static output: every page is pre-built, except the enquiry endpoint (src/pages/api/enquiry.ts),
// which runs on demand. That one route needs a server adapter. The final host is undecided, so the
// standalone Node adapter stays the default; switching host means swapping this one adapter.
export default defineConfig({
  output: 'static',
  adapter: onVercel ? vercel() : node({ mode: 'standalone' }),
  // Current SAEL domain (from v5). Used for canonical URLs and the sitemap; revisit when hosting is set up.
  site: 'https://saelenergy.com',
  // One address per page: /blog, not /blog/. Matches the links, canonical tags and sitemap.
  trailingSlash: 'never',

  // Pages of the current WordPress site (saelenergy.com/wp-sitemap.xml) that have a home here, so
  // old links and Google results keep working. Its leftovers (/hello-world, /sample-page, /footer,
  // /a-homepage-section, /category/uncategorized) are left to return 404. Mapping to be confirmed
  // by SAEL.
  redirects: {
    '/about': '/#capabilities',
    '/who-we-are': '/#capabilities',
    '/contact': '/#contact',
    '/connect-with-us': '/#contact',
    '/solar-roof-top': '/#systems',
    '/epc': '/#process',
    '/om': '/#process',
    '/faqs': '/#faq',
    '/projects': '/#work',
    '/development-support-services': '/',
    '/power-purchase': '/',
    '/legal-disclaimer': '/',
    '/site-map': '/',
  },

  // AVIF at 40 rather than the default 50: about 30% smaller for the LCP budget on phones, with
  // only slight softening in fine detail. WebP and JPEG, the fallbacks, keep their defaults.
  image: {
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { quality: 40 } } },
  },

  // Articles have no code samples, and Shiki's inline styles would break the Content Security Policy.
  markdown: { syntaxHighlight: false },

  security: {
    // Hosts trusted in X-Forwarded-* headers behind a proxy. Without this the enquiry route sees the
    // proxy's address, so the origin check fails and every visitor shares one rate limit.
    allowedDomains: [
      { hostname: 'saelenergy.com', protocol: 'https' },
      { hostname: 'www.saelenergy.com', protocol: 'https' },
      // The test site's addresses. Only on Vercel, where its own proxy sets these headers.
      ...(onVercel ? [{ hostname: '**.vercel.app', protocol: 'https' }] : []),
    ],
    // Printed as a <meta> tag on every page, with hashes for that page's inline scripts and styles.
    // Only frame-ancestors can't go in a meta tag: see server/security-headers.mjs. Turnstile is the
    // one third party: its script and its challenge frame.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self'",
        "font-src 'self'",
        "media-src 'self'",
        "connect-src 'self'",
        'frame-src https://challenges.cloudflare.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: { resources: ["'self'", 'https://challenges.cloudflare.com'] },
      styleDirective: { resources: ["'self'"] },
    },
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
