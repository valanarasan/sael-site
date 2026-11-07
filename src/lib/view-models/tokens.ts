/** Builds the values for {phone}, {email}, {whatsapp}, {offices} and {blog} from settings.json. */
import { mailtoHref, telHref, whatsappHref } from '../contact';
import type { Settings } from '../schemas/settings';
import type { Segment, TokenValues } from '../text';

export function tokenValues(settings: Settings, blogLabel = 'SAEL blog'): TokenValues {
  const { contact, offices } = settings;

  const officeSegments: Segment[] = offices.flatMap((office, i): Segment[] => {
    const parts: Segment[] = [];
    if (i > 0) parts.push({ kind: 'text', text: '; ' });
    parts.push({
      kind: 'text',
      text: office.address ? `${office.name}: ${office.address}` : office.name,
    });
    if (office.phone) {
      parts.push({ kind: 'text', text: ', ' });
      parts.push({ kind: 'link', text: office.phone.display, href: telHref(office.phone.e164) });
    }
    return parts;
  });

  return {
    phone: [{ kind: 'link', text: contact.phone.display, href: telHref(contact.phone.e164) }],
    email: [{ kind: 'link', text: contact.email, href: mailtoHref(contact.email) }],
    whatsapp: [
      { kind: 'link', text: 'WhatsApp', href: whatsappHref(contact.whatsapp), external: true },
    ],
    offices: officeSegments,
    blog: [{ kind: 'link', text: blogLabel, href: '/blog' }],
  };
}
