/**
 * Day/night compare slider. The handle is an ARIA slider: drag anywhere on the photo, or use
 * arrow keys (±5), Page Up/Down (±10), Home and End. With motion allowed, the handle sweeps
 * once to show both sides when the slider first comes into view.
 */
import { prefersReducedMotion } from '../hydrate';

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function initCompare(root: HTMLElement): void {
  const handle = root.querySelector<HTMLElement>('[data-compare-handle]');
  if (!handle) return;
  let value = 50;
  let interacted = false;

  const set = (v: number) => {
    value = clamp(v);
    root.style.setProperty('--p', `${value}%`);
    handle.setAttribute('aria-valuenow', String(Math.round(value)));
    handle.setAttribute('aria-valuetext', `${Math.round(value)}%`);
  };

  const fromPointer = (clientX: number) => {
    const r = root.getBoundingClientRect();
    set(((clientX - r.left) / r.width) * 100);
  };

  let dragging = false;
  root.addEventListener('pointerdown', (e) => {
    dragging = true;
    interacted = true;
    root.setPointerCapture(e.pointerId);
    fromPointer(e.clientX);
  });
  root.addEventListener('pointermove', (e) => {
    if (dragging) fromPointer(e.clientX);
  });
  const stop = () => {
    dragging = false;
  };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);

  handle.addEventListener('keydown', (e) => {
    const steps: Record<string, number> = {
      ArrowLeft: value - 5,
      ArrowDown: value - 5,
      ArrowRight: value + 5,
      ArrowUp: value + 5,
      PageDown: value - 10,
      PageUp: value + 10,
      Home: 0,
      End: 100,
    };
    const next = steps[e.key];
    if (next === undefined) return;
    e.preventDefault();
    interacted = true;
    set(next);
  });

  // One sweep (50 → 18 → 82 → 50) to show it's draggable, unless the visitor got there first.
  if (!prefersReducedMotion()) {
    const legs: [number, number, number][] = [
      [50, 18, 900],
      [18, 82, 1200],
      [82, 50, 900],
    ];
    const run = (i: number) => {
      const leg = legs[i];
      if (!leg || interacted) return;
      const [from, to, ms] = leg;
      const t0 = performance.now();
      const frame = (now: number) => {
        if (interacted) return;
        const t = Math.min(1, (now - t0) / ms);
        set(from + (to - from) * ease(t));
        if (t < 1) requestAnimationFrame(frame);
        else run(i + 1);
      };
      requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.intersectionRatio >= 0.5)) {
          io.disconnect();
          run(0);
        }
      },
      { threshold: 0.5 },
    );
    io.observe(root);
  }

  set(value);
  root.dataset.ready = 'true';
}
