/**
 * Indian mobile numbers: 10 digits starting 6–9, optionally written with +91, 91 or a leading 0,
 * and with spaces, hyphens or brackets. Returns "+91XXXXXXXXXX", or null if it isn't one.
 */
export function normaliseIndianMobile(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  let digits: string;

  if (compact.startsWith('+')) {
    if (!compact.startsWith('+91')) return null;
    digits = compact.slice(3);
  } else if (/^91\d{10}$/.test(compact)) {
    digits = compact.slice(2);
  } else if (/^0\d{10}$/.test(compact)) {
    digits = compact.slice(1);
  } else {
    digits = compact;
  }

  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}
