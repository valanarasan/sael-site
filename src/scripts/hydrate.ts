/**
 * Lazy start for vanilla-TS islands, the equivalent of Astro's client:visible and client:idle
 * for plain <script>s. Pair with a dynamic import() so an island's code only downloads when needed.
 */

/** Runs `start` once, when `el` comes within `margin` of the viewport. */
export function whenVisible(el: Element, start: () => void, margin = '300px'): void {
  if (!('IntersectionObserver' in window)) {
    start();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer.disconnect();
        start();
      }
    },
    { rootMargin: margin },
  );
  observer.observe(el);
}

/** Runs `start` once the browser is idle (or after `timeout` ms at the latest). */
export function whenIdle(start: () => void, timeout = 2000): void {
  if (typeof window.requestIdleCallback === 'function')
    window.requestIdleCallback(start, { timeout });
  else globalThis.setTimeout(start, 200);
}

/** Reads JSON embedded with <script type="application/json" data-island="…">. */
export function readIslandData<T>(root: ParentNode, name: string): T | null {
  const node = root.querySelector<HTMLScriptElement>(
    `script[type="application/json"][data-island="${name}"]`,
  );
  if (!node?.textContent) return null;
  return JSON.parse(node.textContent) as T;
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
