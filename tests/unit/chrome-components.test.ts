// Component tests: the chrome components render exactly the props they are given.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Footer from '../../src/components/sections/Footer.astro';
import Header from '../../src/components/sections/Header.astro';
import MobileBar from '../../src/components/sections/MobileBar.astro';
import MenuSheet from '../../src/components/islands/MenuSheet.astro';
import { toChrome } from '../../src/lib/view-models/chrome';
import { settingsFixture } from '../fixtures/settings';

const chrome = toChrome(settingsFixture, '/blog', 2026);
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

/** Renders a component and drops Astro's scoped-style attributes so assertions read like the markup. */
const render: AstroContainer['renderToString'] = async (component, options) =>
  (await container.renderToString(component, options)).replace(
    / data-astro-cid-\w+(="true")?/g,
    '',
  );

describe('Header', () => {
  it('renders nav links, the CTA and a Menu button wired to the sheet', async () => {
    const html = await render(Header, {
      props: { ...chrome.header, menuId: 'menu-x' },
    });
    expect(html).toContain('<nav class="links" aria-label="Main"');
    expect(html).toMatch(/<a href="\/#systems"[^>]*>\s*Systems\s*<\/a>/);
    expect(html).toMatch(/<a href="\/blog" aria-current="page"[^>]*>\s*Blog\s*<\/a>/);
    expect(html).toContain('Book a survey');
    expect(html).toMatch(/<button[^>]*aria-controls="menu-x"[^>]*>/);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>/);
    expect(html).toContain('alt="Test Solar"');
  });
});

describe('MenuSheet', () => {
  it('renders a labelled dialog with numbered links and contact details', async () => {
    const html = await render(MenuSheet, {
      props: { ...chrome.menu, id: 'menu-x' },
    });
    expect(html).toMatch(/<dialog[^>]*id="menu-x"[^>]*aria-labelledby="menu-x-title"/);
    expect(html).toContain('id="menu-x-title"');
    expect(html).toMatch(/Home <small aria-hidden="true">01<\/small>/);
    expect(html).toMatch(/Blog <small aria-hidden="true">03<\/small>/);
    expect(html).toContain('href="tel:+919000000001"');
    expect(html).toContain('href="mailto:hello@example.com"');
    expect(html).toMatch(/<button[^>]*data-menu-close[^>]*autofocus/);
  });
});

describe('Footer', () => {
  it('renders columns, offices with contact links, copyright and credits', async () => {
    const html = await render(Footer, { props: { ...chrome.footer } });
    expect(html).toContain('data-mbar-hide');
    expect(html).toMatch(/<nav class="fc"[^>]*aria-label="Explore"/);
    expect(html).toContain('<b>Head office</b>');
    expect(html).toContain('1 Test Street, Testville 560001');
    expect(html).toContain('href="tel:+919000000003"');
    expect(html).toContain('href="mailto:overseas@example.com"');
    expect(html).toContain('© 2026 Test Solar LLP');
    expect(html).toContain('Fixture credits.');
  });
});

describe('MobileBar', () => {
  it('renders the call link and the primary CTA', async () => {
    const html = await render(MobileBar, { props: { ...chrome.mobileBar } });
    expect(html).toMatch(/<nav class="mbar"[^>]*aria-label="Quick contact"/);
    expect(html).toContain('href="tel:+919000000001"');
    expect(html).toMatch(/<a class="go" href="\/#contact"[^>]*>Book a survey<\/a>/);
  });
});
