/**
 * The sales-team alert email. Every piece of visitor text is HTML-escaped. The subject reads
 * like "New enquiry: Hybrid solar with battery · Kochi".
 */
import { whatsappHref } from '../contact';
import { istTimestamp } from './google-sheets';
import type { Lead, LeadMeta } from './types';

export interface LeadEmail {
  subject: string;
  html: string;
  text: string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Header-safe: no line breaks, and a sensible length. */
const oneLine = (text: string, max = 80) => text.replace(/[\r\n]+/g, ' ').slice(0, max);

/** "+919880703083" -> "+91 98807 03083" */
export function displayPhone(phone: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}

export function toLeadEmail(lead: Lead, meta: LeadMeta, rowUrl?: string): LeadEmail {
  const subject = oneLine(
    `New enquiry: ${lead.interest}${lead.district ? ` · ${lead.district}` : ''}`,
    120,
  );
  const call = `tel:${lead.phone}`;
  const whatsapp = whatsappHref(
    lead.phone,
    `Hi ${oneLine(lead.name, 40)}, this is SAEL Energy about your enquiry.`,
  );
  const rows: [string, string | undefined][] = [
    ['Name', lead.name],
    ['Phone', displayPhone(lead.phone)],
    ['Interest', lead.interest],
    ['District / PIN', lead.district],
    ['Monthly bill', lead.bill],
    ['Message', lead.message],
    ['Received', `${istTimestamp(meta.receivedAt)} IST`],
    ['Page', meta.page],
    ['Campaign', meta.utm && Object.values(meta.utm).join(' / ')],
  ];
  const present = rows.filter((r): r is [string, string] => Boolean(r[1]));

  const button = (href: string, label: string, bg: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;margin:0 8px 8px 0;border-radius:10px;background:${bg};color:#ffffff;font:600 15px Arial,sans-serif;text-decoration:none">${label}</a>`;

  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#F1F3F1;font:15px/1.5 Arial,sans-serif;color:#0B1F22">',
    '<div style="max-width:560px;margin:0 auto;padding:24px;border-radius:16px;background:#ffffff">',
    `<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(subject)}</h1>`,
    `<p style="margin:0 0 16px">${button(call, 'Call', '#0B1F22')}${button(whatsapp, 'WhatsApp', '#13606A')}</p>`,
    '<table style="width:100%;border-collapse:collapse">',
    ...present.map(
      ([label, value]) =>
        `<tr><th style="padding:8px 12px 8px 0;text-align:left;vertical-align:top;color:#5D7376;font-weight:600;white-space:nowrap">${label}</th><td style="padding:8px 0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
    ),
    '</table>',
    rowUrl
      ? `<p style="margin:20px 0 0"><a href="${escapeHtml(rowUrl)}" style="color:#13606A">Open in the SAEL Leads sheet</a></p>`
      : '',
    '</div></body></html>',
  ].join('');

  const text = [
    subject,
    '',
    ...present.map(([label, value]) => `${label}: ${value}`),
    '',
    `Call: ${call}`,
    `WhatsApp: ${whatsapp}`,
    ...(rowUrl ? [`Sheet: ${rowUrl}`] : []),
  ].join('\n');

  return { subject, html, text };
}
