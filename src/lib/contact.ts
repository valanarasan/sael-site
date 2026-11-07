/** Builders for contact links. Pure functions: numbers and addresses come from settings.json. */

/** tel: link from an international number, e.g. "+91 98807 03083" -> "tel:+919880703083". */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

/** mailto: link. */
export function mailtoHref(email: string, subject?: string): string {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return `mailto:${email}${query}`;
}

/** wa.me link with an optional prefilled message. `number` is digits with country code. */
export function whatsappHref(number: string, text?: string): string {
  const digits = number.replace(/\D/g, '');
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}
