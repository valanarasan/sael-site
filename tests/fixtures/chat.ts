/** Chat content fixture, modelled on chat.json but independent of it. */
import type { ChatContent, Intent } from '../../src/lib/schemas/chat';

const intent = (i: Partial<Intent> & Pick<Intent, 'id' | 'keywords' | 'answer'>): Intent => ({
  links: [],
  related: [],
  ...i,
});

export const intentsFixture: Intent[] = [
  intent({ id: 'hello', keywords: ['hi', 'hello', 'namaste', 'good morning'], answer: 'Hello!' }),
  intent({
    id: 'subsidy',
    keywords: ['subsidy', 'surya ghar', 'yojana', '78,000'],
    answer: 'Up to the central cap. Tell me your size in kW.',
    related: [{ collection: 'blog', id: 'pm-surya-ghar' }],
    whatsapp: 'Hi, check my subsidy.',
  }),
  intent({
    id: 'which',
    keywords: ['which', 'choose', 'on-grid', 'off-grid', 'hybrid'],
    answer: 'On-grid, hybrid or off-grid.',
    links: [{ label: 'Compare systems', href: '/#systems' }],
    related: [
      { collection: 'blog', id: 'types' },
      { collection: 'blog', id: 'missing-post' },
    ],
  }),
  intent({
    id: 'pump',
    keywords: ['pump', 'borewell', 'hp'],
    answer: 'Solar pumps from 1 to 10 HP.',
    whatsapp: 'Hi, a pump please.',
  }),
  intent({
    id: 'not-offered',
    keywords: ['atta', 'chakki', 'water heater', 'geyser'],
    answer: "We don't supply solar atta chakkis or water heaters.",
  }),
  intent({
    id: 'performance',
    keywords: ['clean', 'output', 'dropped', 'amc', 'service', 'maintenance'],
    answer: 'Our AMC keeps it yielding.',
  }),
  intent({
    id: 'blog',
    keywords: ['blog', 'read', 'article'],
    answer: 'Read our blog.',
    links: [{ label: 'Open the blog', href: '/blog' }],
  }),
  intent({
    id: 'price',
    keywords: ['price', 'cost', 'rate', 'how much'],
    answer: 'We quote after a survey.',
  }),
  intent({
    id: 'survey',
    keywords: ['survey', 'site visit', 'visit', 'book'],
    answer: 'The survey is free.',
  }),
  intent({ id: 'contact', keywords: ['phone', 'address', 'office'], answer: 'Call {phone}.' }),
];

export const chatFixture: ChatContent = {
  title: 'Assistant',
  subtitle: 'Replies on WhatsApp',
  openLabel: 'Ask',
  greeting: 'Hi! Ask me anything. Or call {phone}.',
  inputLabel: 'Your question',
  inputPlaceholder: 'Type…',
  note: 'General answers.',
  whatsappLabel: 'Continue on WhatsApp',
  closeLabel: 'Close chat',
  sendLabel: 'Send',
  chipsLabel: 'Suggested questions',
  readLabel: 'Read:',
  fallback: { answer: 'Not sure about that one.', whatsapp: 'Hi, I have a question: {question}' },
  whatsappChip: {
    answer: 'Tap below.',
    whatsapp: 'Hi, let us talk.',
    buttonLabel: 'Open WhatsApp',
  },
  subsidyFollowUp: {
    intentId: 'subsidy',
    answer: 'For a {kw} kW system the central subsidy is about {amount}.',
    capNote: 'It is capped at 3 kW.',
    confirm: 'We confirm it at the survey.',
    whatsapp: 'Hi, I am looking at {kw} kW.',
    buttonLabel: 'Check on WhatsApp',
  },
  chips: [{ label: 'Subsidy', message: 'How much subsidy can I get?' }, { label: 'WhatsApp' }],
  intents: intentsFixture,
};
