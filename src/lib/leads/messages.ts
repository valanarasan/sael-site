/**
 * What the visitor is told about their enquiry. Kept free of imports so the browser script can
 * show the same field messages as the server without bundling the validator.
 */
export const MESSAGES = {
  name: 'Enter your name (letters only, 2 to 80 characters).',
  phone: 'Enter a 10-digit mobile number.',
  interest: "Choose what you're interested in.",
  district: 'Enter your district, or a 6-digit PIN code.',
  bill: 'Choose your monthly bill from the list.',
  message: 'Keep the message under 1,000 characters.',
  consent: 'Please agree to be contacted about your enquiry.',
  form: 'Something went wrong with the form. Please try again.',
  spamCheck: "We couldn't confirm the form was sent by a person. Please try again.",
  rateLimited: 'Too many enquiries from this connection. Please wait a few minutes, or call us.',
  unavailable: "We couldn't send your enquiry just now. Please try again shortly, or call us.",
} as const;

export type LeadMessage = keyof typeof MESSAGES;
