/** Lead fixtures and fakes for the enquiry tests. Never real people or numbers. */
import type { Lead, LeadLogger, LeadMeta } from '../../src/lib/leads';

export const leadFixture: Lead = {
  name: 'Test Customer',
  phone: '+919000000001',
  interest: 'Hybrid solar with battery',
  district: 'Kochi',
  bill: '₹2,000–5,000',
  message: 'Roof faces south.',
  consent: true,
};

export const metaFixture: LeadMeta = {
  receivedAt: new Date('2026-11-07T14:10:00Z'), // 19:40 IST
  page: '/',
  utm: { source: 'google', medium: 'cpc', campaign: 'rooftop' },
};

export const leadOptionsFixture = {
  interests: ['On-grid solar', 'Hybrid solar with battery', 'Commercial or industrial project'],
  billOptions: ['Under ₹2,000', '₹2,000–5,000'],
};

/** Valid raw form fields, as the browser posts them. */
export const formFixture: Record<string, string> = {
  name: 'Test Customer',
  phone: '90000 00001',
  interest: 'Hybrid solar with battery',
  district: 'Kochi',
  bill: '₹2,000–5,000',
  message: 'Roof faces south.',
  consent: 'on',
  website: '',
  page: '/',
  utm_source: 'google',
  'cf-turnstile-response': 'token-ok',
};

export interface LoggedEvent {
  level: 'info' | 'error';
  event: string;
  data?: Record<string, string | number | boolean>;
}

/** Logger that records events, so tests can check nothing personal is logged. */
export function recordingLogger(): LeadLogger & { events: LoggedEvent[] } {
  const events: LoggedEvent[] = [];
  return {
    events,
    info: (event, data) => events.push({ level: 'info', event, ...(data ? { data } : {}) }),
    error: (event, data) => events.push({ level: 'error', event, ...(data ? { data } : {}) }),
  };
}

export interface FakeCall {
  url: string;
  init: RequestInit | undefined;
}

/** fetch stand-in: answers each call with the next handler's response and records the call. */
export function fakeFetch(...handlers: ((call: FakeCall) => Response | Promise<Response>)[]) {
  const calls: FakeCall[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), init };
    calls.push(call);
    const handler = handlers[Math.min(calls.length - 1, handlers.length - 1)];
    if (!handler) throw new Error('no fake response');
    return handler(call);
  };
  return Object.assign(fn as typeof fetch, { calls });
}

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
