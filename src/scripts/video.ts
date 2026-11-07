/**
 * Background video: starts loading and playing only when its section is on screen, pauses when
 * it leaves, and never plays with reduced motion (the poster image shows instead).
 */
import { prefersReducedMotion } from './hydrate';

export function initBackgroundVideo(video: HTMLVideoElement): void {
  if (prefersReducedMotion()) return;
  video.muted = true;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          video.preload = 'auto';
          void video.play().catch(() => {
            /* Autoplay refused (e.g. data saver): the poster stays. */
          });
        } else {
          video.pause();
        }
      }
    },
    { rootMargin: '200px' },
  );
  io.observe(video);
}
