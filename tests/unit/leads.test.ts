import { describe, expect, it } from 'vitest';
import { normaliseIndianMobile, validateLead, type LeadOptions } from '../../src/lib/leads';

const options: LeadOptions = {
  interests: ['On-grid solar', 'Hybrid solar with battery', 'Commercial or industrial project'],
  billOptions: ['Under ₹2,000', '₹2,000–5,000'],
};

const valid = {
  name: 'Anil Kumar',
  phone: '98807 03083',
  interest: 'On-grid solar',
  district: 'Kochi',
  bill: 'Under ₹2,000',
  message: 'Flat roof, about 600 sq ft.',
  consent: 'on',
  website: '',
};

/** Field errors for an input; spam shows as { spam }, a valid lead as {}. */
const errorsFor = (input: Record<string, unknown>): Partial<Record<string, string>> => {
  const r = validateLead(input, options);
  return r.ok ? {} : r.reason === 'invalid' ? r.errors : { spam: 'spam' };
};

describe('normaliseIndianMobile', () => {
  it.each([
    ['9880703083', '+919880703083'],
    ['98807 03083', '+919880703083'],
    ['+91 98807 03083', '+919880703083'],
    ['+919880703083', '+919880703083'],
    ['919880703083', '+919880703083'],
    ['09880703083', '+919880703083'],
    ['+91-98807-03083', '+919880703083'],
    ['(+91) 98807 03083', '+919880703083'],
    ['6000000000', '+916000000000'],
  ])('accepts %s', (input, expected) => {
    expect(normaliseIndianMobile(input)).toBe(expected);
  });

  it.each([
    ['', 'empty'],
    ['988070308', 'too short (9 digits)'],
    ['98807030831', 'too long (11 digits, no leading 0)'],
    ['+91 98807 030831', 'too long after +91'],
    ['5880703083', 'starts with 5'],
    ['0880703083', 'starts with 0 after removing nothing'],
    ['98807O3083', 'contains a letter'],
    ['+1 415 555 0100', 'not Indian'],
    ['9880703083 ext 2', 'extra text'],
  ])('rejects %s (%s)', (input) => {
    expect(normaliseIndianMobile(input)).toBeNull();
  });
});

describe('validateLead', () => {
  it('accepts a valid enquiry and cleans it up', () => {
    const r = validateLead({ ...valid, name: '  Anil   Kumar ', message: '  Hi  ' }, options);
    expect(r).toEqual({
      ok: true,
      lead: {
        name: 'Anil Kumar',
        phone: '+919880703083',
        interest: 'On-grid solar',
        district: 'Kochi',
        bill: 'Under ₹2,000',
        message: 'Hi',
        consent: true,
      },
    });
  });

  it('accepts the minimum: name, phone, interest and consent', () => {
    const r = validateLead(
      {
        name: 'Priya',
        phone: '+91 91130 83917',
        interest: 'Hybrid solar with battery',
        consent: 'true',
      },
      options,
    );
    expect(r).toEqual({
      ok: true,
      lead: {
        name: 'Priya',
        phone: '+919113083917',
        interest: 'Hybrid solar with battery',
        consent: true,
      },
    });
  });

  it('treats empty optional fields as missing', () => {
    const r = validateLead({ ...valid, district: ' ', bill: '', message: '' }, options);
    expect(r.ok && r.lead).not.toHaveProperty('district');
    expect(r.ok && r.lead).not.toHaveProperty('bill');
    expect(r.ok && r.lead).not.toHaveProperty('message');
  });

  it.each(['S. Kumar', "D'Souza", 'Anne-Marie', 'Rāghav', 'ராஜா'])(
    'accepts the name %s',
    (name) => {
      expect(validateLead({ ...valid, name }, options).ok).toBe(true);
    },
  );

  it.each([
    ['', /name/i],
    ['   ', /name/i],
    ['A', /name/i],
    ['12345', /name/i],
    ['x'.repeat(81), /name/i],
    ['http://spam.example', /name/i],
    ['<b>Anil</b>', /name/i],
  ])('rejects the name "%s"', (name, message) => {
    expect(errorsFor({ ...valid, name }).name).toMatch(message);
  });

  it.each(['988070308', '98807030831', '12345', 'call me'])('rejects the phone %s', (phone) => {
    expect(errorsFor({ ...valid, phone }).phone).toMatch(/10-digit mobile/);
  });

  it('rejects a missing phone', () => {
    const { phone: _phone, ...rest } = valid;
    expect(errorsFor(rest).phone).toMatch(/10-digit mobile/);
  });

  it('rejects an interest that is not on the list', () => {
    expect(errorsFor({ ...valid, interest: 'Solar water heater' }).interest).toMatch(/Choose/);
    expect(errorsFor({ ...valid, interest: '' }).interest).toMatch(/Choose/);
  });

  it('rejects a bill option that is not on the list', () => {
    expect(errorsFor({ ...valid, bill: 'A lot' }).bill).toBeDefined();
  });

  it('accepts any bill text when no options are configured', () => {
    expect(
      validateLead({ ...valid, bill: 'about 3000' }, { interests: options.interests }).ok,
    ).toBe(true);
  });

  it.each([
    ['560084', true],
    ['689581', true],
    ['Pathanamthitta', true],
    ['060084', false],
    ['56008', false],
    ['x'.repeat(81), false],
  ])('district or PIN "%s" valid: %s', (district, ok) => {
    expect(validateLead({ ...valid, district }, options).ok).toBe(ok);
  });

  it('accepts a 1,000-character message and rejects a longer one', () => {
    expect(validateLead({ ...valid, message: 'a'.repeat(1000) }, options).ok).toBe(true);
    expect(errorsFor({ ...valid, message: 'a'.repeat(1001) }).message).toMatch(/1,000/);
  });

  it.each([undefined, '', 'off', 'false'])('requires consent (got %s)', (consent) => {
    expect(errorsFor({ ...valid, consent }).consent).toMatch(/agree/i);
  });

  it.each(['on', 'true', 'yes', true])('accepts consent given as %s', (consent) => {
    expect(validateLead({ ...valid, consent }, options).ok).toBe(true);
  });

  it('reports every invalid field at once', () => {
    expect(Object.keys(errorsFor({ name: '', phone: '1', interest: 'x' })).sort()).toEqual([
      'consent',
      'interest',
      'name',
      'phone',
    ]);
  });

  it('flags a filled honeypot as spam, whatever else is in the form', () => {
    expect(validateLead({ ...valid, website: 'https://spam.example' }, options)).toEqual({
      ok: false,
      reason: 'spam',
    });
    expect(validateLead({ website: 'x' }, options)).toEqual({ ok: false, reason: 'spam' });
  });

  it.each([null, undefined, 'a string', 42, ['name']])('rejects non-object input %s', (input) => {
    expect(validateLead(input, options).ok).toBe(false);
  });

  it('ignores unknown fields', () => {
    const r = validateLead({ ...valid, role: 'admin' }, options);
    expect(r.ok && r.lead).not.toHaveProperty('role');
  });

  it('rejects non-string values instead of coercing them', () => {
    expect(errorsFor({ ...valid, name: ['Anil'] }).name).toBeDefined();
    expect(errorsFor({ ...valid, phone: 9880703083 }).phone).toBeDefined();
  });
});
