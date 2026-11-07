/**
 * Enquiry form: quick checks in the browser (the server checks everything again), the
 * Cloudflare Turnstile widget, sending without leaving the page, and the thank-you state.
 * Without this script the form still posts normally and the server redirects to a result page.
 */
import { MESSAGES } from '../../lib/leads/messages';
import { normaliseIndianMobile } from '../../lib/leads/phone';

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id?: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let turnstileScript: Promise<Turnstile | undefined> | undefined;

function loadTurnstile(): Promise<Turnstile | undefined> {
  turnstileScript ??= new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = () => resolve(undefined);
    document.head.append(s);
  });
  return turnstileScript;
}

type FieldName = 'name' | 'phone' | 'interest' | 'district' | 'bill' | 'message' | 'consent';
const FIELDS: FieldName[] = ['name', 'phone', 'interest', 'district', 'bill', 'message', 'consent'];

interface ServerReply {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<string, string>>;
}

const isReply = (v: unknown): v is ServerReply =>
  typeof v === 'object' && v !== null && typeof (v as { ok?: unknown }).ok === 'boolean';

export function initEnquiryForm(form: HTMLFormElement): void {
  const errorBox = form.querySelector<HTMLElement>('[data-form-error]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const submitLabel = submit?.querySelector<HTMLElement>('[data-submit-label]');
  const done = form.parentElement?.querySelector<HTMLElement>('[data-form-ok]');
  const widgetBox = form.querySelector<HTMLElement>('[data-turnstile]');
  const siteKey = form.dataset.siteKey;
  let widgetId: string | undefined;
  let busy = false;

  form.noValidate = true;

  // Page and campaign tags travel with the enquiry (no personal data).
  const params = new URLSearchParams(location.search);
  const setHidden = (name: string, value: string | null) => {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLInputElement && value) input.value = value.slice(0, 100);
  };
  setHidden('page', location.pathname);
  for (const tag of ['utm_source', 'utm_medium', 'utm_campaign']) setHidden(tag, params.get(tag));

  if (siteKey && widgetBox) {
    void loadTurnstile().then((t) => {
      if (!t) return;
      widgetId = t.render(widgetBox, {
        sitekey: siteKey,
        theme: 'dark',
        appearance: 'interaction-only',
        action: 'enquiry',
      });
    });
  }

  const field = (name: FieldName) => {
    const el = form.elements.namedItem(name);
    return el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
      ? el
      : null;
  };

  const showErrors = (errors: Partial<Record<string, string>>, fallback?: string) => {
    let first: HTMLElement | null = null;
    for (const name of FIELDS) {
      const el = field(name);
      if (!el) continue;
      if (errors[name]) {
        el.setAttribute('aria-invalid', 'true');
        if (errorBox?.id) el.setAttribute('aria-describedby', errorBox.id);
        first ??= el;
      } else {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      }
    }
    const firstName = FIELDS.find((n) => errors[n]);
    if (errorBox) errorBox.textContent = (firstName && errors[firstName]) || fallback || '';
    first?.focus();
  };

  const checkInBrowser = (): Partial<Record<FieldName, string>> => {
    const errors: Partial<Record<FieldName, string>> = {};
    const name = field('name')?.value.trim() ?? '';
    if (name.length < 2) errors.name = MESSAGES.name;
    if (!normaliseIndianMobile(field('phone')?.value ?? '')) errors.phone = MESSAGES.phone;
    if (!field('interest')?.value) errors.interest = MESSAGES.interest;
    const consent = field('consent');
    if (consent instanceof HTMLInputElement && !consent.checked) errors.consent = MESSAGES.consent;
    return errors;
  };

  const setBusy = (on: boolean) => {
    busy = on;
    form.setAttribute('aria-busy', String(on));
    if (!submit) return;
    submit.disabled = on;
    if (submitLabel) {
      submitLabel.dataset.idle ??= submitLabel.textContent ?? '';
      submitLabel.textContent = on ? (form.dataset.sending ?? '') : submitLabel.dataset.idle;
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const errors = checkInBrowser();
    if (Object.keys(errors).length) return showErrors(errors);
    showErrors({});

    const body = new URLSearchParams();
    for (const [key, value] of new FormData(form))
      if (typeof value === 'string') body.append(key, value);

    setBusy(true);
    let reply: ServerReply | undefined;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      });
      const data: unknown = await res.json().catch(() => undefined);
      reply = isReply(data) ? data : undefined;
    } catch {
      reply = undefined;
    }
    setBusy(false);

    if (reply?.ok) {
      form.hidden = true;
      if (done) {
        done.hidden = false;
        done.focus();
      }
      return;
    }
    if (widgetId !== undefined) window.turnstile?.reset(widgetId);
    showErrors(reply?.errors ?? {}, reply?.message ?? MESSAGES.unavailable);
  });

  form.dataset.ready = 'true';
}
