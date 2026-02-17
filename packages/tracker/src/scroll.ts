/**
 * Scroll depth tracker — records max scroll percentage
 */

let maxScroll = 0;

export function getScrollDepth(): number {
  return maxScroll;
}

export function trackScroll(): void {
  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    const winHeight = window.innerHeight;

    if (docHeight <= winHeight) {
      maxScroll = 100;
      return;
    }

    const pct = Math.min(100, Math.round((scrollTop / (docHeight - winHeight)) * 100));
    if (pct > maxScroll) {
      maxScroll = pct;
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  // Initial check
  update();
}

export function resetScrollDepth(): void {
  maxScroll = 0;
}
