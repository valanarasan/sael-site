// Component tests: home sections render the props they are given, with the right semantics.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Audience from '../../src/components/sections/Audience.astro';
import Contact from '../../src/components/sections/Contact.astro';
import Faq from '../../src/components/sections/Faq.astro';
import Projects from '../../src/components/sections/Projects.astro';
import Subsidy from '../../src/components/sections/Subsidy.astro';
import Systems from '../../src/components/sections/Systems.astro';
import Why from '../../src/components/sections/Why.astro';
import { toProjectsView } from '../../src/lib/view-models/projects';
import { toCalculatorView, toSlabRows, toStateOptions } from '../../src/lib/view-models/subsidy';
import { projectsFixture, subsidyFixture } from '../fixtures/content';
import { sectionsFixture as s } from '../fixtures/sections';
import { sectionsSchema } from '../../src/lib/schemas/sections';
import { imageStub } from '../fixtures/content';

// Parse the fixture so defaults (placeholder: false, tick: false) are filled in as in a real build.
const sections = sectionsSchema(imageStub).parse(s);

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const render = async (
  component: Parameters<AstroContainer['renderToString']>[0],
  props: Record<string, unknown>,
) =>
  (await container.renderToString(component, { props })).replace(
    / data-astro-cid-\w+(="true")?/g,
    '',
  );

describe('Systems', () => {
  it('renders an ARIA table with ticks only where the value is not a dash, and picks on-grid', async () => {
    const rows = [
      { label: 'Subsidy', onGrid: 'Homes', offGrid: '—', hybrid: 'Homes', tick: true },
      { label: 'Battery', onGrid: 'None', offGrid: 'Yes', hybrid: 'Yes', tick: false },
    ];
    const html = await render(Systems, {
      number: 1,
      ...sections.systems,
      table: { ...sections.systems.table, rows },
    });
    expect(html).toMatch(/role="table" aria-label="Table"/);
    expect((html.match(/class="y"/g) ?? []).length).toBe(2);
    expect(html).toMatch(/role="columnheader" data-system="onGrid" class="pick"/);
    expect(html).toContain('<b>01</b>');
    expect(html).toMatch(
      /<button type="button" aria-pressed="true" data-value="yes">Yes<\/button>/,
    );
  });
});

describe('Subsidy', () => {
  it('renders the slabs, the state list and the default estimate', async () => {
    const html = await render(Subsidy, {
      number: 2,
      ...sections.subsidy,
      slabs: toSlabRows(subsidyFixture),
      states: toStateOptions(subsidyFixture),
      view: toCalculatorView(3, 'BB', subsidyFixture),
      minKw: 1,
      maxKw: 10,
    });
    expect(html).toContain('₹20,000 / kW');
    expect(html).toMatch(/<option value="AA" selected>Alpha<\/option>/);
    expect(html).toMatch(/<input id="calc-kw" type="range" min="1" max="10"/);
    expect(html).toContain('Beta top-up');
    expect(html).toContain('+ ₹8,000');
    expect(html).toMatch(/data-total-label>\s*Both\s*</);
    expect(html).toContain('₹58,000');
  });
});

describe('Why', () => {
  it('marks placeholder tiles with a dashed border and the "Content from SAEL" tag', async () => {
    const html = await render(Why, { number: 4, ...sections.why });
    expect((html.match(/class="bx[^"]*todo/g) ?? []).length).toBe(1);
    expect((html.match(/Content from SAEL/g) ?? []).length).toBe(1);
  });
});

describe('Projects', () => {
  it('renders a card with no photo without an empty image box', async () => {
    const html = await render(Projects, {
      number: 7,
      eyebrow: 'Projects',
      heading: 'Across *South India*',
      ...toProjectsView(projectsFixture),
    });
    expect(html).toMatch(/<article class="pc no-photo">/);
    expect(html).toContain('No Photo Co');
    expect(html).not.toContain('Hidden'); // draft
    expect(html).toMatch(/<li><b>2 MW<\/b><span>Confidential · power facilitation<\/span><\/li>/);
  });
});

describe('Audience', () => {
  it('renders WAI-ARIA tabs with only the first panel shown', async () => {
    const html = await render(Audience, { number: 8, ...sections.audience });
    expect(html).toMatch(/role="tablist" aria-label="Audience"/);
    expect(html).toMatch(
      /id="aud-tab-0" aria-controls="aud-panel-0" aria-selected="true" tabindex="0"/,
    );
    expect(html).toMatch(
      /id="aud-tab-1" aria-controls="aud-panel-1" aria-selected="false" tabindex="-1"/,
    );
    expect(html).toMatch(/id="aud-panel-1" aria-labelledby="aud-tab-1" hidden/);
    expect(html).not.toMatch(/id="aud-panel-0"[^>]*hidden/);
  });
});

describe('Faq', () => {
  it('renders exclusive accordions with the first open and linked intro', async () => {
    const html = await render(Faq, {
      number: 9,
      eyebrow: 'FAQs',
      heading: 'Questions',
      intro: [
        { kind: 'text', text: 'Call ' },
        { kind: 'link', text: '+91 90000 00001', href: 'tel:+919000000001' },
      ],
      items: [
        { question: 'First?', answer: 'First answer.' },
        { question: 'Second?', answer: 'Second answer.' },
      ],
    });
    expect(html).toMatch(/<details name="faq" open>\s*<summary>First\?<\/summary>/);
    expect(html).toMatch(/<details name="faq">\s*<summary>Second\?<\/summary>/);
    expect(html).toContain('<a href="tel:+919000000001">+91 90000 00001</a>');
  });
});

describe('Contact', () => {
  const props = {
    number: 10,
    eyebrow: 'Book',
    heading: 'Book *now*',
    intro: 'Leave your number.',
    poster: { src: '/_fixtures/bg.jpg', width: 1920, height: 1080, format: 'jpg' },
    videoSrc: '/video/test.mp4',
    form: sections.contact.form,
    offices: [
      { name: 'Head office', phone: { label: '+91 90000 00003', href: 'tel:+919000000003' } },
      { name: 'No phone' },
    ],
    email: { label: 'a@example.com', href: 'mailto:a@example.com' },
    whatsappLink: 'https://wa.me/919000000002?text=Hi',
  };

  it('posts every field the endpoint expects, with labels, a honeypot and required consent', async () => {
    const html = await render(Contact, props);
    expect(html).toMatch(/<form class="qf" method="post" action="\/api\/enquiry"/);
    for (const name of [
      'name',
      'phone',
      'district',
      'bill',
      'interest',
      'message',
      'website',
      'consent',
    ]) {
      expect(html, name).toContain(`name="${name}"`);
    }
    for (const id of ['q-name', 'q-phone', 'q-district', 'q-bill', 'q-interest', 'q-message']) {
      expect(html, id).toContain(`<label for="${id}">`);
    }
    expect(html).toMatch(/<input type="checkbox" name="consent" value="on" required>/);
    expect(html).toMatch(/<div class="hp" aria-hidden="true">/);
    expect(html).toMatch(/name="website" tabindex="-1" autocomplete="off"/);
    expect(html).toContain('<option>On-grid solar</option>');
  });

  it('keeps the video muted, not autoplaying, and hidden from screen readers', async () => {
    const html = await render(Contact, props);
    const video = html.match(/<video[^>]*>/)?.[0] ?? '';
    for (const attr of ['muted', 'loop', 'playsinline', 'preload="none"', 'aria-hidden="true"']) {
      expect(video, attr).toContain(attr);
    }
    expect(video).toMatch(/poster="[^"]+"/);
    expect(html).not.toMatch(/<video[^>]*autoplay/);
  });

  it('opens WhatsApp in a new tab safely and lists only offices with phones', async () => {
    const html = await render(Contact, props);
    expect(html).toMatch(
      /href="https:\/\/wa\.me\/919000000002\?text=Hi"[^>]*target="_blank" rel="noopener noreferrer"/,
    );
    expect(html).toContain('Head office <a href="tel:+919000000003">');
    expect(html).not.toContain('No phone');
  });
});
