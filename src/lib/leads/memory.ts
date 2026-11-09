/**
 * Stand-ins used when LEADS_DRIVER=memory (local development and the end-to-end tests): leads
 * stay in this process's memory, nothing is emailed and every spam check passes. Never for
 * production: index.ts logs a warning whenever this driver starts.
 */
import type { Lead, LeadMeta, LeadNotifier, LeadStore, SpamCheck } from './types';

export interface MemoryLeadStore extends LeadStore {
  readonly leads: { id: string; lead: Lead; meta: LeadMeta }[];
}

export function memoryLeadStore(): MemoryLeadStore {
  const leads: { id: string; lead: Lead; meta: LeadMeta }[] = [];
  return {
    leads,
    async save(lead, meta) {
      const id = String(leads.length + 2); // like a sheet row under its header
      leads.push({ id, lead, meta });
      return { id };
    },
  };
}

export const silentNotifier: LeadNotifier = { notify: async () => {} };

export const passSpamCheck: SpamCheck = { verify: async () => true };
