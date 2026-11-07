/**
 * Turns editable text into safe segments for components to render. Content never becomes raw
 * HTML: links and accents are separate segments, and everything else is plain text.
 */
import type { TextToken } from './schemas/common';

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'accent'; text: string }
  | { kind: 'link'; text: string; href: string; external?: boolean };

/**
 * Splits "Up to *₹78,000* back" into plain and accent segments. Empty segments are dropped.
 * An unpaired asterisk (the schema rejects these) is kept as plain text.
 */
export function parseAccent(text: string): Segment[] {
  const parts = text.split('*');
  if (parts.length % 2 === 0) return [{ kind: 'text', text }];
  return parts.flatMap((part, i): Segment[] => {
    if (!part) return [];
    return [{ kind: i % 2 === 1 ? 'accent' : 'text', text: part }];
  });
}

export type TokenValues = Partial<Record<TextToken, Segment[]>>;

/**
 * Replaces {phone}, {email} and the other tokens with their segments. Unknown or missing tokens
 * are left as written so a typo is visible rather than silently dropped.
 */
export function fillTokens(template: string, values: TokenValues): Segment[] {
  const out: Segment[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = out.at(-1);
    if (last?.kind === 'text') last.text += text;
    else out.push({ kind: 'text', text });
  };

  let cursor = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const [whole, name] = match;
    pushText(template.slice(cursor, match.index));
    const segments = values[name as TextToken];
    if (segments) {
      segments.forEach((s) => (s.kind === 'text' ? pushText(s.text) : out.push({ ...s })));
    } else {
      pushText(whole);
    }
    cursor = match.index + whole.length;
  }
  pushText(template.slice(cursor));
  return out;
}

/** Plain-text version of segments, e.g. for aria-labels or WhatsApp messages. */
export function segmentsToText(segments: Segment[]): string {
  return segments.map((s) => s.text).join('');
}

/**
 * Fills {name} placeholders in a plain string, e.g. "{minutes} min read" with { minutes: 4 }.
 * Unknown placeholders are left as written.
 */
export function fillPlain(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
