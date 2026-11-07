import type { Settings } from '../../src/lib/schemas/settings';

/** Test fixture. Deliberately different from src/content/settings.json so live edits never break tests. */
export const settingsFixture: Settings = {
  seo: {
    title: 'Test Solar · Rooftop solar',
    description: 'Fixture description that is long enough to pass the schema minimum length.',
  },
  company: {
    name: 'Test Solar',
    legalName: 'Test Solar LLP',
    tagline: 'Test tagline',
    summary: 'Test Solar summary.',
  },
  contact: {
    phone: { display: '+91 90000 00001', e164: '+919000000001' },
    whatsapp: '919000000002',
    email: 'hello@example.com',
  },
  offices: [
    {
      name: 'Head office',
      address: '1 Test Street, Testville 560001',
      phone: { display: '+91 90000 00003', e164: '+919000000003' },
    },
    { name: 'Overseas', email: 'overseas@example.com' },
  ],
  primaryCta: { label: 'Book a survey', href: '/#contact' },
  nav: {
    header: [
      { label: 'Systems', href: '/#systems' },
      { label: 'Blog', href: '/blog' },
    ],
    menu: [
      { label: 'Home', href: '/' },
      { label: 'Systems', href: '/#systems' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  footer: {
    columns: [{ title: 'Explore', links: [{ label: 'FAQs', href: '/#faq' }] }],
    credits: 'Fixture credits.',
  },
};
