import { describe, expect, it } from 'vitest';
import { settingsSchema } from '../../src/lib/schemas/settings';
import { settingsFixture } from '../fixtures/settings';

const withChange = (change: (s: typeof settingsFixture) => void) => {
  const copy = structuredClone(settingsFixture);
  change(copy);
  return settingsSchema.safeParse(copy);
};

describe('settingsSchema', () => {
  it('accepts valid settings', () => {
    expect(settingsSchema.safeParse(settingsFixture).success).toBe(true);
  });

  it('rejects a phone number not in international format', () => {
    const result = withChange((s) => {
      s.contact.phone.e164 = '09880703083';
    });
    expect(result.success).toBe(false);
  });

  it('rejects a WhatsApp number with a plus sign or spaces', () => {
    expect(withChange((s) => (s.contact.whatsapp = '+91 98807 03083')).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(withChange((s) => (s.contact.email = 'info-at-example.com')).success).toBe(false);
  });

  it('rejects an external URL in the navigation', () => {
    const result = withChange((s) => {
      s.nav.header[0] = { label: 'Elsewhere', href: 'https://example.com' };
    });
    expect(result.success).toBe(false);
  });

  it('rejects a javascript: link', () => {
    const result = withChange((s) => {
      s.primaryCta.href = 'javascript:alert(1)';
    });
    expect(result.success).toBe(false);
  });

  it('accepts section links and site paths', () => {
    const result = withChange((s) => {
      s.nav.menu = [
        { label: 'A', href: '/#faq' },
        { label: 'B', href: '/blog/om-amc' },
        { label: 'C', href: '#contact' },
      ];
    });
    expect(result.success).toBe(true);
  });

  it('requires at least one office', () => {
    expect(withChange((s) => (s.offices = [])).success).toBe(false);
  });

  it('allows an office with no address or phone', () => {
    expect(withChange((s) => (s.offices = [{ name: 'NZ' }])).success).toBe(true);
  });
});
