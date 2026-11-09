/**
 * POST /api/enquiry: the site's one server route. Everything it does lives in lib/leads; this
 * file only reads the environment and the form options, and builds the handler once per server
 * process (so the rate limiter keeps its counts between requests).
 */
import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { getSections } from '../../lib/content';
import {
  createEnquiryHandler,
  ENV_KEYS,
  enquiryResponse,
  readLeadsConfig,
  type EnquiryHandler,
  type LeadsEnv,
} from '../../lib/leads';

export const prerender = false;

const PAGES = { thanks: '/enquiry/sent', problem: '/enquiry/problem' };

let handler: Promise<EnquiryHandler | null> | undefined;

function getHandler(): Promise<EnquiryHandler | null> {
  handler ??= (async () => {
    const env: LeadsEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, getSecret(key)]));
    const { form } = (await getSections()).contact;
    return createEnquiryHandler(readLeadsConfig(env), {
      options: { interests: form.interests, billOptions: form.billOptions },
    });
  })();
  return handler;
}

function clientIp(read: () => string): string | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) =>
  enquiryResponse(
    request,
    clientIp(() => clientAddress),
    await getHandler(),
    PAGES,
  );

export const ALL: APIRoute = () =>
  new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
