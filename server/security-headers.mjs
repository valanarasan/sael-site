/**
 * HTTP security headers for every response, the one list the production server reads. If the site
 * moves to a host that doesn't run server/start.mjs, copy these into that host's header settings.
 *
 * The rest of the Content Security Policy is a <meta> tag on each page (astro.config.mjs). A meta
 * tag can't carry frame-ancestors, so that directive is sent here; browsers apply both.
 *
 * HSTS leaves out includeSubDomains and preload on purpose: both would also force HTTPS on any
 * other saelenergy.com subdomain (mail, for example), which can't be checked from this project.
 */
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});
