/**
 * Contracts the enquiry endpoint depends on. Which sheet, CRM or email service sits behind them
 * is decided only in lib/leads/index.ts (step 9).
 */

/** A validated enquiry. `phone` is always "+91" followed by 10 digits. */
export interface Lead {
  name: string;
  phone: string;
  interest: string;
  /** District or PIN code. */
  district?: string;
  /** Monthly electricity bill band. */
  bill?: string;
  message?: string;
  consent: true;
}

export interface LeadStore {
  save(lead: Lead): Promise<{ id: string }>;
}

export interface LeadNotifier {
  notify(lead: Lead, id: string): Promise<void>;
}
