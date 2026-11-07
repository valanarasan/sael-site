/** Browser code for the subsidy calculator island. All maths and formatting come from lib/. */
import { toCalculatorView, type CalculatorData } from '../../lib/view-models/subsidy';
import { readIslandData } from '../hydrate';

const ANNOUNCE_DELAY = 500;

export function initCalculator(root: HTMLElement): void {
  const data = readIslandData<CalculatorData>(root, 'calculator');
  const slider = root.querySelector<HTMLInputElement>('input[type="range"]');
  const select = root.querySelector<HTMLSelectElement>('select');
  if (!data || !slider || !select) return;

  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel);
  const kwValue = $<HTMLElement>('[data-kw-value]');
  const slabRows = [...root.querySelectorAll<HTMLElement>('[data-slab-row]')];
  const stateRow = $<HTMLElement>('[data-state-row]');
  const stateLabel = $<HTMLElement>('[data-state-label]');
  const totalLabel = $<HTMLElement>('[data-total-label]');
  const total = $<HTMLElement>('[data-total]');
  const note = $<HTMLElement>('[data-state-note]');
  const announce = $<HTMLElement>('[data-announce]');
  const { labels, rules } = data;
  let announceTimer: number | undefined;

  const update = () => {
    const kw = Number(slider.value);
    const view = toCalculatorView(kw, select.value, rules);

    if (kwValue) kwValue.textContent = String(kw);
    slider.setAttribute('aria-valuetext', `${kw} kW`);

    view.slabRows.forEach((row, i) => {
      const el = slabRows[i];
      if (!el) return;
      el.classList.toggle('dim', row.dim);
      const dd = el.querySelector('dd');
      if (dd) dd.textContent = row.value;
    });

    stateRow?.classList.toggle('dim', view.state.dim);
    if (stateLabel) {
      stateLabel.textContent = view.state.name
        ? labels.namedStateTopUpLabel.replace('{state}', view.state.name)
        : labels.stateTopUpLabel;
    }
    const stateValue = stateRow?.querySelector('dd');
    if (stateValue) stateValue.textContent = view.state.value;

    const totalText = view.total.combined ? labels.combinedTotalLabel : labels.centralTotalLabel;
    if (totalLabel) totalLabel.textContent = totalText;
    if (total) total.textContent = view.total.value;
    if (note) note.textContent = view.note ?? '';

    // One summary for screen readers once the visitor stops dragging, not every cell on every step.
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      if (announce) announce.textContent = `${kw} kW: ${totalText} ${view.total.value}`;
    }, ANNOUNCE_DELAY);
  };

  slider.addEventListener('input', update);
  select.addEventListener('change', update);
  // The visitor may have moved the controls before the script loaded (or the browser restored them).
  update();
  root.dataset.ready = 'true';
}
