/**
 * Static JSON for the chat assistant, built at build time and fetched by the chat island only
 * when the visitor opens it. Contains public information only (answers, contact details, rates).
 */
import type { APIRoute } from 'astro';
import { getChat, getPosts, getSettings, getSubsidyRules } from '../lib/content';
import { toChatData } from '../lib/view-models/chat';

export const prerender = true;

export const GET: APIRoute = async () => {
  const [chat, settings, rules, posts] = await Promise.all([
    getChat(),
    getSettings(),
    getSubsidyRules(),
    getPosts(),
  ]);
  return new Response(JSON.stringify(toChatData({ chat, settings, rules, posts })), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
