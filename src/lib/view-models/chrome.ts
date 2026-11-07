/**
 * Adapters from settings.json to the props of the site chrome: header, menu sheet,
 * footer and mobile action bar. Pure functions so they can be unit-tested with fixtures.
 */
import { mailtoHref, telHref } from '../contact';
import type { Link, Settings } from '../schemas/settings';

export type AriaCurrent = 'page' | 'true';

export interface NavLink extends Link {
  current?: AriaCurrent;
}

export interface HeaderProps {
  homeHref: string;
  logoAlt: string;
  links: NavLink[];
  cta: Link;
}

export interface MenuSheetProps {
  links: NavLink[];
  email: { label: string; href: string };
  phone: { label: string; href: string };
}

export interface FooterOffice {
  name: string;
  address?: string;
  phone?: { label: string; href: string };
  email?: { label: string; href: string };
}

export interface FooterProps {
  homeHref: string;
  logoAlt: string;
  summary: string;
  columns: { title: string; links: Link[] }[];
  offices: FooterOffice[];
  email: { label: string; href: string };
  copyright: string;
  credits?: string;
}

export interface MobileBarProps {
  callHref: string;
  cta: Link;
}

export interface Chrome {
  header: HeaderProps;
  menu: MenuSheetProps;
  footer: FooterProps;
  mobileBar: MobileBarProps;
}

/** Strips a trailing slash so "/blog/" and "/blog" compare equal. */
function normalisePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * Marks a nav link as current. Section links ("/#faq") are never "current": they point into the
 * home page, which the scroll spy (step 7) highlights instead.
 */
export function currentState(href: string, pathname: string): AriaCurrent | undefined {
  if (href.includes('#')) return undefined;
  const target = normalisePath(href);
  const here = normalisePath(pathname);
  if (here === target) return 'page';
  if (target !== '/' && here.startsWith(`${target}/`)) return 'true';
  return undefined;
}

function withCurrent(links: Link[], pathname: string): NavLink[] {
  return links.map((link) => {
    const current = currentState(link.href, pathname);
    return current ? { ...link, current } : { ...link };
  });
}

export function toChrome(settings: Settings, pathname: string, year: number): Chrome {
  const { company, contact, offices, nav, primaryCta, footer } = settings;
  const logoAlt = company.name;
  const phone = { label: contact.phone.display, href: telHref(contact.phone.e164) };
  const email = { label: contact.email, href: mailtoHref(contact.email) };

  return {
    header: { homeHref: '/', logoAlt, links: withCurrent(nav.header, pathname), cta: primaryCta },
    menu: { links: withCurrent(nav.menu, pathname), email, phone },
    footer: {
      homeHref: '/',
      logoAlt,
      summary: company.summary,
      columns: footer.columns,
      offices: offices.map((office) => ({
        name: office.name,
        ...(office.address ? { address: office.address } : {}),
        ...(office.phone
          ? { phone: { label: office.phone.display, href: telHref(office.phone.e164) } }
          : {}),
        ...(office.email ? { email: { label: office.email, href: mailtoHref(office.email) } } : {}),
      })),
      email,
      copyright: `© ${year} ${company.legalName}`,
      ...(footer.credits ? { credits: footer.credits } : {}),
    },
    mobileBar: { callHref: phone.href, cta: primaryCta },
  };
}
