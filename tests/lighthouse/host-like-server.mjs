/**
 * Serves the production build the way a real host does, for Lighthouse: HTTP/2 over TLS with gzip,
 * in front of the app server. Hosting isn't decided, and every host or CDN in the running does
 * this; `npm start` alone is HTTP/1.1 with no compression, and scores lower for that reason alone.
 * A throwaway certificate is made on each run. Test use only.
 *
 * If the site ends up on a bare Node server with nothing in front of it, this no longer reflects
 * production: add compression to server/start.mjs.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createSecureServer } from 'node:http2';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const APP_PORT = '4321';
const PORT = 4443;
const HOP_BY_HOP = new Set([
  'connection',
  'content-length',
  'date',
  'keep-alive',
  'transfer-encoding',
]);

process.env.PORT = APP_PORT;
process.env.LEADS_DRIVER = 'memory';
// Not awaited: it only finishes when the server closes.
void import('../../server/start.mjs');

const dir = mkdtempSync(join(tmpdir(), 'sael-lighthouse-'));
const [key, cert] = [join(dir, 'key.pem'), join(dir, 'cert.pem')];
execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '1',
    '-keyout',
    key,
    '-out',
    cert,
    '-subj',
    '/CN=localhost',
  ],
  { stdio: 'ignore' },
);

const server = createSecureServer({ key: readFileSync(key), cert: readFileSync(cert) });

server.on('stream', async (stream, request) => {
  try {
    const upstream = await fetch(`http://localhost:${APP_PORT}${request[':path']}`, {
      method: request[':method'],
      redirect: 'manual',
      headers: { accept: request.accept ?? '*/*' },
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    const headers = { ':status': upstream.status };
    for (const [name, value] of upstream.headers) {
      if (!HOP_BY_HOP.has(name)) headers[name] = value;
    }
    const compressible = /text|javascript|json|xml/.test(headers['content-type'] ?? '');
    if (compressible && /gzip/.test(request['accept-encoding'] ?? '')) {
      stream.respond({ ...headers, 'content-encoding': 'gzip' });
      stream.end(gzipSync(body));
    } else {
      stream.respond(headers);
      stream.end(body);
    }
  } catch {
    stream.destroy();
  }
});

// Lighthouse CI waits for this line.
server.listen(PORT, () => process.stdout.write(`host-like server listening on ${PORT}\n`));
