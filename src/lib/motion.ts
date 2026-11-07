/**
 * Motion facade: the one place that knows about GSAP, ScrollTrigger and Lenis.
 * Ports the v5 animations. Effects attach to `data-motion` hooks in the markup, never to
 * component class names. Call initMotion() only when reduced motion is off; with reduced
 * motion the page is complete and static without it.
 *
 * Only transform, opacity and clip-path are animated, so nothing shifts layout.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

type Vars = gsap.TweenVars;

const EASE = 'expo.out';
const DESKTOP = '(min-width: 861px)';
const MOBILE = '(max-width: 860px)';

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(sel),
];

/**
 * Animates in once when `trigger` scrolls into view. CSS transitions are switched off while
 * GSAP animates (they fight each other), and GSAP's inline styles are cleared at the end so
 * hover effects in the component CSS work again.
 */
function revealOnce(targets: gsap.TweenTarget, trigger: Element, from: Vars, start = 'top 85%') {
  gsap.set(targets, { transition: 'none' });
  gsap.from(targets, {
    duration: 1.1,
    ease: EASE,
    ...from,
    clearProps: 'transform,opacity,transition',
    scrollTrigger: { trigger, start, once: true },
  });
}

// --- smooth scroll -------------------------------------------------------------------------------

let lenis: Lenis | null = null;

function initSmoothScroll(): void {
  lenis = new Lenis({ lerp: 0.09 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Same-page section links ("#faq" or "/#faq") glide instead of jumping.
  document.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    lenis?.scrollTo(target, { duration: 1.6 });
    history.pushState(null, '', url.hash);
  });

  // Modal dialogs (menu, photo viewer) pause smooth scrolling behind them.
  document.addEventListener('motion:pause', () => lenis?.stop());
  document.addEventListener('motion:resume', () => lenis?.start());
}

// --- split headings ------------------------------------------------------------------------------

/** Wraps each word in <span class="w"><i>…</i></span> so it can rise from a mask. */
function splitWords(el: Element): HTMLElement[] {
  const words: HTMLElement[] = [];
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        (child.textContent ?? '').split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.append(part);
            return;
          }
          const w = document.createElement('span');
          w.className = 'w';
          const i = document.createElement('i');
          i.textContent = part;
          w.append(i);
          words.push(i);
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child instanceof Element && !child.classList.contains('w')) {
        walk(child);
      }
    });
  };
  walk(el);
  return words;
}

function initSplitHeadings(): void {
  $$('[data-split]').forEach((h) => {
    const words = splitWords(h);
    gsap.from(words, {
      yPercent: 105,
      duration: 1,
      ease: EASE,
      stagger: 0.045,
      scrollTrigger: { trigger: h, start: 'top 86%', once: true },
    });
  });
}

// --- hero ----------------------------------------------------------------------------------------

function initHero(): void {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;
  const copy = hero.querySelector<HTMLElement>('[data-hero-copy]');
  const win = hero.querySelector<HTMLElement>('[data-hero-window]');
  const track = hero.querySelector<HTMLElement>('[data-hero-track]');
  const caption = hero.querySelector<HTMLElement>('[data-hero-caption]');
  const index = hero.querySelector<HTMLElement>('[data-hero-index]');
  const slides = $$('[data-hero-slide]', hero);
  const ticks = $$('[data-hero-ticks] i', hero);
  const capParts = $$('[data-hero-tag], [data-hero-title], [data-hero-credit]', hero);
  const h1 = hero.querySelector('h1');
  if (!copy || !win || !track) return;

  // Intro. The photo is visible from the first paint (it is the LCP element); the copy rises in.
  const words = h1 ? splitWords(h1) : [];
  const firstImg = slides[0]?.querySelector('img');
  const intro = gsap.timeline({ onComplete: () => hero.classList.add('intro-done') });
  if (firstImg) intro.from(firstImg, { scale: 1.3, duration: 2, ease: EASE }, 0);
  intro.fromTo(
    [
      ...$$(':scope > .lbl, :scope > .intro, :scope > .h-row, :scope > .h-meta > div', copy),
      ...words,
    ],
    { yPercent: 60, y: 20, opacity: 0 },
    { yPercent: 0, y: 0, opacity: 1, duration: 1, ease: EASE, stagger: 0.06 },
    0.15,
  );
  gsap.set(copy, { opacity: 1 });

  // Caption follows the slide in view.
  let shown = 0;
  const setCaption = (i: number) => {
    if (i === shown) return;
    shown = i;
    const slide = slides[i];
    if (!slide) return;
    gsap.to(capParts, {
      opacity: 0,
      y: -8,
      duration: 0.2,
      onComplete: () => {
        const [tag, title, credit] = capParts;
        if (tag) tag.textContent = slide.dataset.tag ?? '';
        if (title) title.textContent = slide.dataset.title ?? '';
        if (credit) credit.textContent = slide.dataset.credit ?? '';
        gsap.fromTo(
          capParts,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: EASE },
        );
      },
    });
    ticks.forEach((t, j) => t.classList.toggle('on', j === i));
    if (index) index.textContent = String(i + 1).padStart(2, '0');
  };

  const mm = gsap.matchMedia();
  mm.add(DESKTOP, () => {
    // Pinned: the window opens to full screen, then the slides travel sideways.
    const n = slides.length;
    const length = n * 0.8 + 1;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => `+=${window.innerHeight * length}`,
        pin: true,
        scrub: 0.9,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (st) => {
          const p = Math.max(0, (st.progress * length - 1) / (n * 0.8));
          setCaption(Math.min(n - 1, Math.round(p * (n - 1))));
        },
      },
    });
    tl.to(copy, { xPercent: -30, opacity: 0, duration: 0.8 }, 0)
      .to(
        win,
        { clipPath: 'inset(0vh 0vw 0vh 0vw round 0px)', duration: 1, ease: 'power2.inOut' },
        0,
      )
      .to(slides, { '--o': 1, duration: 0.6 }, 0.4)
      .fromTo(caption, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, 0.6)
      .to(index, { opacity: 1, duration: 0.4 }, 0.7)
      .to(track, { x: () => -(n - 1) * window.innerWidth, duration: n * 0.8 }, 1);
    slides.forEach((s, i) => {
      const img = s.querySelector('img');
      if (i && img)
        tl.fromTo(
          img,
          { xPercent: -18, scale: 1.12 },
          { xPercent: 0, scale: 1, duration: 0.8 },
          1 + (i - 1) * 0.8,
        );
    });
  });
  mm.add(MOBILE, () => {
    // Phones: the row is swipeable; the caption follows it.
    const onScroll = () =>
      setCaption(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  });
}

// --- section effects -----------------------------------------------------------------------------

/** One entry per `data-motion` value: what animates and how. Mirrors the v5 effects. */
const EFFECTS: Record<string, (el: HTMLElement) => void> = {
  /** Children rise in sequence. `data-motion-distance` sets how far (default 40px). */
  'stagger-up': (el) =>
    revealOnce(
      el.children,
      el,
      { y: Number(el.dataset.motionDistance ?? 40), opacity: 0, stagger: 0.08 },
      'top 88%',
    ),
  /** Children slide in from the left. */
  'stagger-left': (el) =>
    revealOnce(el.children, el, { x: -40, opacity: 0, stagger: 0.06 }, 'top 88%'),
  /** Children slide in from the right. */
  'stagger-right': (el) =>
    revealOnce(el.children, el, { x: 60, opacity: 0, stagger: 0.1 }, 'top 75%'),
  /** A dark panel rises with a slight tilt (finder, calculator). */
  'tilt-up': (el) =>
    revealOnce(el, el, { y: 90, rotate: 2.5, opacity: 0, duration: 1.3 }, 'top 88%'),
  /** Bento tiles flip up in sequence. */
  flip: (el) =>
    revealOnce(el.children, el, {
      y: 80,
      opacity: 0,
      rotateX: -14,
      transformOrigin: '50% 100%',
      transformPerspective: 1000,
      duration: 1.2,
      stagger: 0.09,
    }),
  /**
   * Gallery cards slide in from the right. Scroll-snap is paused until they land: otherwise the
   * row snaps to the shifted cards and ends up scrolled.
   */
  'slide-in': (el) => {
    el.style.scrollSnapType = 'none';
    revealOnce(el.children, el, {
      x: 160,
      opacity: 0,
      duration: 1.3,
      stagger: 0.08,
      onComplete: () => {
        el.scrollLeft = 0;
        el.style.scrollSnapType = '';
      },
    });
  },
  /** A photo's mask opens downwards while the photo counter-scrolls. */
  'mask-down': (el) => {
    gsap.fromTo(
      el,
      { clipPath: 'inset(0% 0% 100% 0% round 28px)' },
      {
        clipPath: 'inset(0% 0% 0% 0% round 28px)',
        duration: 1.4,
        ease: 'expo.inOut',
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      },
    );
    const img = el.querySelector('img');
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.25 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    }
  },
  /** A card's mask opens from the left. */
  'clip-right': (el) =>
    gsap.from(el, {
      clipPath: 'inset(0% 100% 0% 0% round 28px)',
      duration: 1.4,
      ease: 'expo.inOut',
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    }),
  /** Background drifts slower than the page. */
  parallax: (el) =>
    gsap.fromTo(
      el,
      { yPercent: -16 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement ?? el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    ),
  /** Children (except the split heading block) fade up. */
  'stagger-soft': (el) =>
    revealOnce(
      [...el.children].filter((c) => !c.querySelector('[data-split]')),
      el,
      { y: 30, opacity: 0, duration: 1, stagger: 0.08 },
      'top 75%',
    ),
  /** Letters rise from below (footer wordmark). */
  letters: (el) =>
    revealOnce(el.children, el, { yPercent: 100, duration: 1.2, stagger: 0.08 }, 'top 95%'),
};

function initEffects(): void {
  $$('[data-motion]').forEach((el) => {
    const effect = EFFECTS[el.dataset.motion ?? ''];
    if (effect) effect(el);
  });
}

/** Whole numbers marked data-count count up from 0, in Indian digit grouping. */
function initCountUps(): void {
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    if (!Number.isFinite(to)) return;
    const counter = { v: 0 };
    gsap.to(counter, {
      v: to,
      duration: 2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => {
        el.textContent = Math.round(counter.v).toLocaleString('en-IN');
      },
    });
  });
}

/** How it works: steps light up and the tracker fills as the section scrolls past. */
function initTracker(): void {
  const root = document.querySelector<HTMLElement>('[data-motion-tracker]');
  if (!root) return;
  const steps = $$('[data-step]', root);
  const stages = $$('[data-stage]', root);
  ScrollTrigger.create({
    trigger: root,
    start: 'top 70%',
    end: 'bottom 30%',
    scrub: true,
    onUpdate: (st) => {
      const k = Math.min(stages.length - 1, Math.floor(st.progress * stages.length));
      stages.forEach((s, j) => s.classList.toggle('on', j <= k));
      steps.forEach((s, j) =>
        s.classList.toggle('lit', j <= Math.floor(st.progress * steps.length - 0.01)),
      );
    },
  });
}

// --- entry point ---------------------------------------------------------------------------------

let started = false;

export function initMotion(): void {
  if (started) return;
  started = true;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('motion-on');
  initSmoothScroll();
  initHero();
  initSplitHeadings();
  initEffects();
  initCountUps();
  initTracker();
  window.addEventListener('load', () => ScrollTrigger.refresh());
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
