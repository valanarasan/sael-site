import { describe, expect, it } from 'vitest';
import { currentState, toChrome } from '../../src/lib/view-models/chrome';
import { settingsFixture } from '../fixtures/settings';

describe('currentState', () => {
  it.each([
    ['/blog', '/blog', 'page'],
    ['/blog', '/blog/', 'page'],
    ['/blog', '/blog/om-amc', 'true'],
    ['/', '/', 'page'],
  ] as const)('%s on %s is %s', (href, path, expected) => {
    expect(currentState(href, path)).toBe(expected);
  });

  it.each([
    ['/', '/blog'],
    ['/blog', '/'],
    ['/blog', '/blogger'],
    ['/#systems', '/'],
    ['#faq', '/'],
  ])('%s on %s is not current', (href, path) => {
    expect(currentState(href, path)).toBeUndefined();
  });
});

describe('toChrome', () => {
  const chrome = toChrome(settingsFixture, '/blog/some-post', 2026);

  it('maps header links and marks the current section of the site', () => {
    expect(chrome.header.links).toEqual([
      { label: 'Systems', href: '/#systems' },
      { label: 'Blog', href: '/blog', current: 'true' },
    ]);
    expect(chrome.header.cta).toEqual({ label: 'Book a survey', href: '/#contact' });
    expect(chrome.header.logoAlt).toBe('Test Solar');
  });

  it('gives the menu tel and mailto links from contact settings', () => {
    expect(chrome.menu.phone).toEqual({ label: '+91 90000 00001', href: 'tel:+919000000001' });
    expect(chrome.menu.email).toEqual({
      label: 'hello@example.com',
      href: 'mailto:hello@example.com',
    });
    expect(chrome.menu.links.map((l) => l.current)).toEqual([undefined, undefined, 'true']);
  });

  it('maps offices, leaving out missing fields', () => {
    expect(chrome.footer.offices).toEqual([
      {
        name: 'Head office',
        address: '1 Test Street, Testville 560001',
        phone: { label: '+91 90000 00003', href: 'tel:+919000000003' },
      },
      {
        name: 'Overseas',
        email: { label: 'overseas@example.com', href: 'mailto:overseas@example.com' },
      },
    ]);
  });

  it('builds the copyright line from the legal name and year', () => {
    expect(chrome.footer.copyright).toBe('© 2026 Test Solar LLP');
  });

  it('passes credits through, and omits them when empty', () => {
    expect(chrome.footer.credits).toBe('Fixture credits.');
    const noCredits = structuredClone(settingsFixture);
    delete noCredits.footer.credits;
    expect(toChrome(noCredits, '/', 2026).footer).not.toHaveProperty('credits');
  });

  it('points the mobile bar at the main phone and primary CTA', () => {
    expect(chrome.mobileBar).toEqual({
      callHref: 'tel:+919000000001',
      cta: { label: 'Book a survey', href: '/#contact' },
    });
  });

  it('does not mutate the settings it is given', () => {
    const before = structuredClone(settingsFixture);
    toChrome(settingsFixture, '/blog', 2026);
    expect(settingsFixture).toEqual(before);
  });
});
