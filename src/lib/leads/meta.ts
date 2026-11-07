/**
 * Non-personal context sent with the form: the page path and campaign (UTM) tags. Anything
 * malformed is dropped rather than rejected, since it never stops a real enquiry.
 */
import type { LeadMeta } from './types';

const PAGE = /^\/[\w\-./]{0,200}$/;
const TAG = /^[\w\-.+ %]{1,100}$/;

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;

const tag = (v: unknown): string | undefined => {
  const t = text(v);
  return t && TAG.test(t) ? t : undefined;
};

export function parseLeadMeta(fields: Record<string, unknown>, receivedAt: Date): LeadMeta {
  const page = text(fields.page);
  const utm: NonNullable<LeadMeta['utm']> = {};
  const source = tag(fields.utm_source);
  const medium = tag(fields.utm_medium);
  const campaign = tag(fields.utm_campaign);
  if (source) utm.source = source;
  if (medium) utm.medium = medium;
  if (campaign) utm.campaign = campaign;
  return {
    receivedAt,
    ...(page && PAGE.test(page) && !page.includes('..') ? { page } : {}),
    ...(Object.keys(utm).length ? { utm } : {}),
  };
}
