/**
 * Browser code for the chat assistant. Opening and closing is handled here; the matcher (lib/chat)
 * and the answers (/chat-data.json) load on first open. Every message is built with DOM nodes,
 * never innerHTML, so nothing a visitor types can become markup.
 */
import type * as ChatEngine from '../../lib/chat';
import type { ChatReply, ChatState } from '../../lib/chat';
import type { Segment } from '../../lib/text';
import type { ChatData } from '../../lib/view-models/chat';
import { prefersReducedMotion } from '../hydrate';

type Engine = typeof ChatEngine;

const TYPING_DELAY = 500;
const MOBILE = '(max-width: 860px)';

export function initChat(root: HTMLElement): void {
  const fab = root.querySelector<HTMLButtonElement>('[data-chat-open]');
  const panel = root.querySelector<HTMLDialogElement>('[data-chat-panel]');
  const log = root.querySelector<HTMLElement>('[data-chat-log]');
  const form = root.querySelector<HTMLFormElement>('[data-chat-form]');
  const input = form?.querySelector<HTMLInputElement>('input');
  const waIcon = root.querySelector<HTMLTemplateElement>('template[data-wa-icon]');
  if (!fab || !panel || !log || !form || !input) return;

  const readLabel = root.dataset.readLabel ?? '';
  let state: ChatState = { expectingSize: false };
  let loaded: Promise<{ engine: Engine; data: ChatData } | null> | null = null;
  let started = false;

  const load = () =>
    (loaded ??= Promise.all([
      import('../../lib/chat'),
      fetch('/chat-data.json').then((r) =>
        r.ok ? (r.json() as Promise<ChatData>) : Promise.reject(r),
      ),
    ])
      .then(([engine, data]) => ({ engine, data }))
      .catch(() => null));

  // --- rendering -------------------------------------------------------------------------------

  const scrollDown = () => {
    log.scrollTop = log.scrollHeight;
  };

  const link = (text: string, href: string, className?: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    if (className) a.className = className;
    if (/^https?:/.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    return a;
  };

  const appendSegments = (el: HTMLElement, segments: Segment[]) => {
    for (const s of segments) {
      if (s.kind === 'text') el.append(s.text);
      else if (s.kind === 'accent') {
        const em = document.createElement('em');
        em.textContent = s.text;
        el.append(em);
      } else el.append(link(s.text, s.href));
    }
  };

  const bubble = (who: 'bot' | 'me') => {
    const el = document.createElement('div');
    el.className = `cb-m ${who}`;
    log.append(el);
    return el;
  };

  const renderReply = (reply: ChatReply) => {
    if (reply.kind === 'none') return;
    const el = bubble('bot');
    appendSegments(el, reply.segments);
    for (const l of reply.links) el.append(link(`${l.label} →`, l.href, 'cb-more'));
    for (const r of reply.reads) el.append(link(`${readLabel} ${r.title} →`, r.href, 'cb-more'));
    if (reply.whatsapp) {
      const wa = link(reply.whatsapp.label, reply.whatsapp.href, 'cb-wa');
      const icon = waIcon?.content.firstElementChild?.cloneNode(true);
      if (icon) wa.prepend(icon);
      el.append(document.createElement('br'), wa);
    }
    scrollDown();
  };

  const offlineReply = () => {
    const el = bubble('bot');
    el.append(root.dataset.offlineText ?? '');
    const href = root.dataset.offlineHref;
    if (href) {
      el.append(
        document.createElement('br'),
        link(root.dataset.offlineLabel ?? 'WhatsApp', href, 'cb-wa'),
      );
    }
    scrollDown();
  };

  /** Shows the typing dots for a moment (not with reduced motion), then runs `then`. */
  const typing = (then: () => void) => {
    if (prefersReducedMotion()) {
      then();
      return;
    }
    const dots = document.createElement('div');
    dots.className = 'cb-typing';
    dots.setAttribute('aria-hidden', 'true');
    dots.append(
      document.createElement('i'),
      document.createElement('i'),
      document.createElement('i'),
    );
    log.append(dots);
    scrollDown();
    window.setTimeout(() => {
      dots.remove();
      then();
    }, TYPING_DELAY);
  };

  // --- conversation ----------------------------------------------------------------------------

  const respond = (
    makeTurn: (engine: Engine, data: ChatData) => ReturnType<Engine['replyToText']>,
  ) => {
    void load().then((ready) =>
      typing(() => {
        if (!ready) return offlineReply();
        const turn = makeTurn(ready.engine, ready.data);
        state = turn.state;
        renderReply(turn.reply);
      }),
    );
  };

  const sendText = (text: string) => {
    const question = text.trim();
    if (!question) return;
    bubble('me').textContent = question;
    scrollDown();
    respond((engine, data) => engine.replyToText(question, state, data));
  };

  const sendChip = (label: string, message: string | undefined) => {
    bubble('me').textContent = label;
    scrollDown();
    respond((engine, data) => engine.replyToChip({ label, message }, state, data));
  };

  // --- open / close ----------------------------------------------------------------------------

  const open = () => {
    panel.show();
    fab.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => panel.classList.add('open'));
    if (!started) {
      started = true;
      void load().then((ready) => {
        if (!ready) return offlineReply();
        const el = bubble('bot');
        appendSegments(el, ready.data.greeting);
        scrollDown();
      });
    }
    input.focus();
  };

  const close = () => {
    panel.classList.remove('open');
    panel.close();
    fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  };

  fab.addEventListener('click', open);
  root.querySelector('[data-chat-close]')?.addEventListener('click', close);
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendText(input.value);
    input.value = '';
  });
  root
    .querySelectorAll<HTMLButtonElement>('[data-chip]')
    .forEach((chip) =>
      chip.addEventListener('click', () =>
        sendChip(chip.textContent?.trim() ?? '', chip.dataset.message),
      ),
    );
  // On phones the panel covers the page, so following a link into the page closes it.
  log.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a');
    if (a && a.getAttribute('href')?.startsWith('/') && window.matchMedia(MOBILE).matches) close();
  });
  root.dataset.ready = 'true';
}
