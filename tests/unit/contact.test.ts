import { describe, expect, it } from 'vitest';
import { mailtoHref, telHref, whatsappHref } from '../../src/lib/contact';

describe('telHref', () => {
  it.each([
    ['+919880703083', 'tel:+919880703083'],
    ['+91 98807 03083', 'tel:+919880703083'],
    ['+64 21-982-414', 'tel:+6421982414'],
  ])('%s -> %s', (input, expected) => {
    expect(telHref(input)).toBe(expected);
  });
});

describe('mailtoHref', () => {
  it('builds a plain mailto link', () => {
    expect(mailtoHref('info@example.com')).toBe('mailto:info@example.com');
  });

  it('encodes a subject', () => {
    expect(mailtoHref('info@example.com', 'Solar & battery?')).toBe(
      'mailto:info@example.com?subject=Solar%20%26%20battery%3F',
    );
  });
});

describe('whatsappHref', () => {
  it('builds a wa.me link from digits', () => {
    expect(whatsappHref('919880703083')).toBe('https://wa.me/919880703083');
  });

  it('strips anything that is not a digit', () => {
    expect(whatsappHref('+91 98807-03083')).toBe('https://wa.me/919880703083');
  });

  it('encodes a prefilled message', () => {
    expect(whatsappHref('919880703083', 'Hi, 3 kW in Kochi?')).toBe(
      'https://wa.me/919880703083?text=Hi%2C%203%20kW%20in%20Kochi%3F',
    );
  });
});
