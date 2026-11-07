/**
 * RSS 2.0 feed builder. Small enough to own instead of adding a dependency; pure, so the output
 * is unit-tested. All text is XML-escaped; links must already be absolute.
 */

export interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate: Date;
  category?: string;
}

export interface RssChannel {
  title: string;
  description: string;
  /** Absolute URL of the blog page. */
  link: string;
  /** Absolute URL of the feed itself (atom:link rel="self"). */
  feedUrl: string;
  language?: string;
  items: RssItem[];
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c);
}

const tag = (name: string, value: string) => `<${name}>${escapeXml(value)}</${name}>`;

function itemXml(item: RssItem): string {
  return [
    '<item>',
    tag('title', item.title),
    tag('link', item.link),
    `<guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
    tag('pubDate', item.pubDate.toUTCString()),
    item.description ? tag('description', item.description) : '',
    item.category ? tag('category', item.category) : '',
    '</item>',
  ].join('');
}

export function buildRss(channel: RssChannel): string {
  const items = [...channel.items].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  const latest = items[0];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    tag('title', channel.title),
    tag('description', channel.description),
    tag('link', channel.link),
    `<atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    tag('language', channel.language ?? 'en-IN'),
    latest ? tag('lastBuildDate', latest.pubDate.toUTCString()) : '',
    ...items.map(itemXml),
    '</channel>',
    '</rss>',
  ].join('\n');
}
