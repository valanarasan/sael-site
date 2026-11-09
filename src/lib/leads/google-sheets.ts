/**
 * LeadStore that appends a row to the "SAEL Leads" Google Sheet through the Sheets REST API,
 * signed in as a service account (a JWT signed with Node's crypto; no Google SDK needed).
 * Values are written RAW, so text such as "=SUM(…)" is stored as text, never run as a formula.
 */
import { createSign } from 'node:crypto';
import { z } from 'astro/zod';
import type { Lead, LeadMeta, LeadStore } from './types';

export const SHEET_COLUMNS = [
  'Received (IST)',
  'Name',
  'Phone',
  'Interest',
  'District / PIN',
  'Monthly bill',
  'Message',
  'Page',
  'UTM source',
  'UTM medium',
  'UTM campaign',
  'Consent',
  'Status',
  'Owner',
] as const;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/** "2026-11-07 19:40" in India time: readable, and sorts correctly as text. */
export function istTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

/** One sheet row, in SHEET_COLUMNS order. */
export function toSheetRow(lead: Lead, meta: LeadMeta): string[] {
  return [
    istTimestamp(meta.receivedAt),
    lead.name,
    lead.phone,
    lead.interest,
    lead.district ?? '',
    lead.bill ?? '',
    lead.message ?? '',
    meta.page ?? '',
    meta.utm?.source ?? '',
    meta.utm?.medium ?? '',
    meta.utm?.campaign ?? '',
    'Yes',
    'New',
    '',
  ];
}

const base64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

/** A signed service-account assertion (RFC 7523) for Google's token endpoint. */
export function serviceAccountJwt(email: string, privateKey: string, nowSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${signer.sign(privateKey, 'base64url')}`;
}

/** Row number from an append response's range, e.g. "Leads!A12:N12" -> "12". */
export function rowFromRange(range: string): string | undefined {
  return /![A-Z]+(\d+)/.exec(range)?.[1];
}

const tokenSchema = z.object({ access_token: z.string(), expires_in: z.number() });
const appendSchema = z.object({ updates: z.object({ updatedRange: z.string() }) });

/** Carries only the step and HTTP status, never the request (which holds the lead). */
export class SheetsError extends Error {
  readonly step: 'token' | 'append';
  readonly status: number;

  constructor(step: 'token' | 'append', status: number) {
    super(`Google Sheets ${step} failed with HTTP ${status}`);
    this.name = 'SheetsError';
    this.step = step;
    this.status = status;
  }
}

export interface GoogleSheetOptions {
  serviceAccountEmail: string;
  /** PEM private key; "\n" escapes (as stored in env vars) are turned into newlines. */
  privateKey: string;
  sheetId: string;
  tab: string;
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

export function googleSheetStore(options: GoogleSheetOptions): LeadStore {
  const { serviceAccountEmail, sheetId, tab, fetch: doFetch = fetch, now = Date.now } = options;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const privateKey = options.privateKey.replace(/\\n/g, '\n');
  let cached: { token: string; expiresAt: number } | undefined;

  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt - 60_000 > now()) return cached.token;
    const assertion = serviceAccountJwt(serviceAccountEmail, privateKey, Math.floor(now() / 1000));
    const res = await doFetch(TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new SheetsError('token', res.status);
    const { access_token, expires_in } = tokenSchema.parse(await res.json());
    cached = { token: access_token, expiresAt: now() + expires_in * 1000 };
    return access_token;
  }

  return {
    async save(lead, meta) {
      const token = await accessToken();
      const range = encodeURIComponent(`${tab}!A1`);
      const url =
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}` +
        `/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
      const res = await doFetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [toSheetRow(lead, meta)] }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new SheetsError('append', res.status);
      const { updates } = appendSchema.parse(await res.json());
      return { id: rowFromRange(updates.updatedRange) ?? updates.updatedRange };
    },
  };
}

/** Link to a lead's row, for the alert email. */
export function sheetRowUrl(sheetId: string, gid: string, row: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/edit#gid=${encodeURIComponent(gid)}&range=A${encodeURIComponent(row)}`;
}
