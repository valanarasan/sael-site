/** Browser code for the gallery island: prev/next, mouse drag-to-scroll and the lightbox. */
import { prefersReducedMotion } from '../hydrate';

const DRAG_THRESHOLD = 6;
const VIEWER_SIZES = '(max-width: 1500px) 92vw, 1500px';

export function initGallery(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-gallery]');
  const viewer = root.querySelector<HTMLDialogElement>('[data-gallery-viewer]');
  if (!track || !viewer) return;
  const items = [...track.querySelectorAll<HTMLElement>('[data-gallery-item]')];
  const behavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

  // Prev / next: scroll by one item.
  const step = () => {
    const first = items[0];
    if (!first) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  };
  root
    .querySelector('[data-gallery-prev]')
    ?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: behavior() }));
  root
    .querySelector('[data-gallery-next]')
    ?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: behavior() }));

  // Drag to scroll with a mouse. Touch and trackpads already scroll natively.
  let down = false;
  let startX = 0;
  let startScroll = 0;
  let moved = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true;
    moved = 0;
    startX = e.clientX;
    startScroll = track.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > DRAG_THRESHOLD) track.classList.add('down');
    track.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', () => {
    down = false;
    track.classList.remove('down');
  });
  // A drag must not also count as a click on a photo.
  track.addEventListener(
    'click',
    (e) => {
      if (moved > DRAG_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
        moved = 0;
      }
    },
    true,
  );

  // Lightbox.
  const imageSlot = viewer.querySelector<HTMLElement>('[data-viewer-image]');
  const title = viewer.querySelector<HTMLElement>('[data-viewer-title]');
  const credit = viewer.querySelector<HTMLElement>('[data-viewer-credit]');
  const creditPrefix = viewer.dataset.credit ?? '';
  let current = 0;

  const show = (index: number) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    const picture = item?.querySelector('picture');
    if (!item || !picture || !imageSlot) return;
    const copy = picture.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('source').forEach((s) => s.setAttribute('sizes', VIEWER_SIZES));
    const img = copy.querySelector('img');
    if (img) {
      img.setAttribute('sizes', VIEWER_SIZES);
      img.loading = 'eager';
    }
    imageSlot.replaceChildren(copy);
    if (title) title.textContent = item.dataset.title ?? '';
    if (credit) credit.textContent = [creditPrefix, item.dataset.place].filter(Boolean).join(' · ');
  };

  const open = (index: number) => {
    show(index);
    viewer.showModal();
    requestAnimationFrame(() => viewer.classList.add('open'));
  };

  const close = () => {
    viewer.classList.remove('open');
    viewer.close();
  };

  track
    .querySelectorAll<HTMLButtonElement>('[data-gallery-open]')
    .forEach((button) =>
      button.addEventListener('click', () => open(Number(button.dataset.galleryOpen))),
    );
  viewer.querySelector('[data-viewer-close]')?.addEventListener('click', close);
  viewer.querySelector('[data-viewer-prev]')?.addEventListener('click', () => show(current - 1));
  viewer.querySelector('[data-viewer-next]')?.addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'ArrowLeft') show(current - 1);
  });
  // Clicking the dark area around the photo closes the viewer.
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) close();
  });
  viewer.addEventListener('close', () => viewer.classList.remove('open'));
  root.dataset.ready = 'true';
}
