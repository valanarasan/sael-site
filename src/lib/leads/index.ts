/**
 * Leads: types, validation and (from step 9) the one place that picks the storage and email
 * vendors behind LeadStore and LeadNotifier.
 */
export { normaliseIndianMobile } from './phone';
export type { Lead, LeadNotifier, LeadStore } from './types';
export {
  HONEYPOT_FIELD,
  MESSAGES as LEAD_MESSAGES,
  validateLead,
  type LeadField,
  type LeadOptions,
  type LeadValidation,
} from './validation';
