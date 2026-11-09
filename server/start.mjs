/**
 * Production server (`npm start`): the Node adapter's own server plus the security headers.
 * The adapter serves pre-built pages straight from disk, so Astro middleware never sees them and
 * can't set headers on them. Set PORT and HOST as usual; run `npm run build` first.
 */
import { SECURITY_HEADERS } from './security-headers.mjs';

// Stops the built server starting itself on import, so the listener below is in place first.
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { startServer } = await import('../dist/server/entry.mjs');

const { server, done } = startServer();

server.server.prependListener('request', (_request, response) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value);
});

await done;
