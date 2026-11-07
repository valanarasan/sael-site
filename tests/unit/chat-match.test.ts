import { describe, expect, it } from 'vitest';
import { extractKw, keywordMatches, matchIntent, scoreIntent } from '../../src/lib/chat';
import { intentsFixture as intents } from '../fixtures/chat';

const idFor = (text: string) => matchIntent(text, intents)?.id ?? null;
const intent = (id: string) => {
  const found = intents.find((i) => i.id === id);
  if (!found) throw new Error(`fixture intent ${id} missing`);
  return found;
};

describe('each intent matches its typical questions', () => {
  it.each([
    ['Hi there', 'hello'],
    ['Namaste!', 'hello'],
    ['How much subsidy can I get?', 'subsidy'],
    ['Tell me about PM Surya Ghar', 'subsidy'],
    ['Is the ₹78,000 real?', 'subsidy'],
    ['Which system should I choose?', 'which'],
    ['On-grid or hybrid?', 'which'],
    ['I need a borewell pump', 'pump'],
    ['Is a 5 HP motor enough?', 'pump'],
    ['My solar output has dropped', 'performance'],
    ['Do you clean panels?', 'performance'],
    ['Where can I read more?', 'blog'],
    ['What is the price?', 'price'],
    ['How much does it cost?', 'price'],
    ['Can I book a site visit?', 'survey'],
    ['What is your office address?', 'contact'],
  ])('"%s" -> %s', (text, id) => {
    expect(idFor(text)).toBe(id);
  });
});

describe('removed products', () => {
  it.each([
    'Do you sell solar atta chakki?',
    'I want a solar water heater',
    'Solar water heaters for my hotel?',
    'Do you have a solar geyser',
  ])('"%s" gets the "not offered" answer', (text) => {
    expect(idFor(text)).toBe('not-offered');
  });
});

describe('unknown text', () => {
  it.each(['What is the weather today?', '', '   ', '???'])('"%s" matches nothing', (text) => {
    expect(matchIntent(text, intents)).toBeNull();
  });
});

describe('keyword clashes', () => {
  it('"service" with "book" and "visit" picks the survey, not AMC', () => {
    expect(idFor('Can I book a service visit?')).toBe('survey');
  });

  it('"AMC service cost" picks AMC: two AMC keywords beat one price keyword', () => {
    expect(idFor('What does an AMC service cost?')).toBe('performance');
  });

  it('a tie goes to the intent listed first', () => {
    // "clean" (performance) and "price" (price) both score 2; performance is listed first.
    expect(idFor('clean price')).toBe('performance');
  });
});

describe('keywords only match whole words or word starts (v5 bug)', () => {
  it('"read" does not match "already"', () => {
    expect(idFor('I already asked about this')).toBeNull();
  });

  it('"rate" does not match "separate" or "generate"', () => {
    expect(idFor('Do I need a separate meter?')).toBeNull();
    expect(idFor('How much do panels generate?')).toBe('price'); // via "how much", not "rate"
    expect(scoreIntent('how much do panels generate', intent('price'))).toBe(2);
  });

  it('short keywords like "hi" and "hp" need the whole word', () => {
    expect(idFor('this is about whatsapp chips')).toBeNull();
    expect(idFor('3 hp pump')).toBe('pump');
  });

  it('long keywords match the start of a longer word', () => {
    expect(idFor('Cleaning schedule?')).toBe('performance');
    expect(idFor('Booking a survey')).toBe('survey');
  });
});

describe('keywordMatches', () => {
  it.each([
    ['water heater', 'solar water heaters please', true],
    ['water heater', 'water-heater', false],
    ['on-grid', 'an on-grid system', true],
    ['78,000', 'is ₹78,000 the max', true],
    ['hi', 'Hi!', true],
    ['hi', 'hill', false],
    ['clean', 'unclean', false],
    ['clean', 'cleaning', true],
    ['a+b', 'what is a+b', true],
  ])('%s in "%s" -> %s', (keyword, text, expected) => {
    expect(keywordMatches(keyword, text)).toBe(expected);
  });
});

describe('scoreIntent', () => {
  it('weighs keywords longer than four letters double', () => {
    const subsidy = intent('subsidy');
    expect(scoreIntent('subsidy', subsidy)).toBe(2);
    expect(scoreIntent('subsidy yojana', subsidy)).toBe(4);
    const pump = intent('pump');
    expect(scoreIntent('pump', pump)).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(scoreIntent('SUBSIDY', intent('subsidy'))).toBe(2);
  });
});

describe('extractKw', () => {
  it.each([
    ['3 kW', 3],
    ['3kw please', 3],
    ['about 5 kilowatt', 5],
    ['a 4 kilowatts system', 4],
    ['2.5 kW', 2],
    ['0.5 kw', 1],
    ['25 kW for my factory', 10],
  ])('reads "%s" as %i kW', (text, kw) => {
    expect(extractKw(text, false)).toBe(kw);
  });

  it('ignores a bare number unless a size was just asked for', () => {
    expect(extractKw('3', false)).toBeNull();
    expect(extractKw('3', true)).toBe(3);
    expect(extractKw('maybe 4?', true)).toBe(4);
  });

  it('ignores big bare numbers like bills or rupee amounts', () => {
    expect(extractKw('my bill is 4500', true)).toBeNull();
    expect(extractKw('78,000', true)).toBeNull();
  });

  it('returns null when there is no number', () => {
    expect(extractKw('subsidy please', true)).toBeNull();
  });
});
