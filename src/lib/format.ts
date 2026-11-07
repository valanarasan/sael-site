/** Display formatting shared across the site. Indian conventions: lakh grouping, IST dates. */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** 108000 -> "₹1,08,000" */
export function formatInr(amount: number): string {
  return `₹${inr.format(Math.round(amount))}`;
}

const dateLabel = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

/** A date as "5 Nov 2026" (in India time). */
export function formatDate(date: Date): string {
  return dateLabel.format(date);
}

/** A date as "2026-11-05" for <time datetime>, in India time. */
export function isoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date);
  return parts;
}
