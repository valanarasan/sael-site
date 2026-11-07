// @ts-check
import { defineConfig } from 'astro/config';

// Static output. The enquiry route (step 9) will opt out of prerendering and
// needs a server adapter; hosting is undecided, so no adapter is set yet.
export default defineConfig({
  output: 'static',
  // Current SAEL domain (from v5). Used for canonical URLs and the sitemap; revisit when hosting is set up.
  site: 'https://saelenergy.com',
  trailingSlash: 'ignore',
});
