/**
 * Web Vitals — TTFB, FCP, LCP, CLS, INP, FID via PerformanceObserver
 */

export interface WebVitals {
  ttfb_ms: number | null;
  fcp_ms: number | null;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  fid_ms: number | null;
}

const vitals: WebVitals = {
  ttfb_ms: null,
  fcp_ms: null,
  lcp_ms: null,
  cls: null,
  inp_ms: null,
  fid_ms: null,
};

let clsValue = 0;

export function getVitals(): WebVitals {
  return { ...vitals };
}

export function observeVitals(): void {
  if (typeof PerformanceObserver === 'undefined') return;

  // TTFB from navigation timing
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) {
      vitals.ttfb_ms = Math.round(nav.responseStart - nav.requestStart);
    }
  } catch { /* ignore */ }

  // FCP
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          vitals.fcp_ms = Math.round(entry.startTime);
          fcpObserver.disconnect();
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch { /* ignore */ }

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        vitals.lcp_ms = Math.round(last.startTime);
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* ignore */ }

  // CLS
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          vitals.cls = Math.round(clsValue * 1000) / 1000;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch { /* ignore */ }

  // INP (Interaction to Next Paint)
  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = (entry as any).duration ?? entry.startTime;
        if (vitals.inp_ms === null || duration > vitals.inp_ms) {
          vitals.inp_ms = Math.round(duration);
        }
      }
    });
    inpObserver.observe({ type: 'event', buffered: true });
  } catch { /* ignore */ }

  // FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        vitals.fid_ms = Math.round((entry as any).processingStart - entry.startTime);
        fidObserver.disconnect();
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch { /* ignore */ }
}
