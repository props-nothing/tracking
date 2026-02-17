/**
 * SPA navigation detection — pushState, replaceState, popstate, hashchange
 */

export function onSPANavigation(callback: (url: string) => void): void {
  // Monkey-patch pushState
  const origPushState = history.pushState;
  history.pushState = function (...args) {
    origPushState.apply(this, args);
    callback(window.location.href);
  };

  // Monkey-patch replaceState
  const origReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    origReplaceState.apply(this, args);
    callback(window.location.href);
  };

  // popstate (back/forward)
  window.addEventListener('popstate', () => {
    callback(window.location.href);
  });

  // hashchange (hash-based SPA routing)
  window.addEventListener('hashchange', () => {
    callback(window.location.href);
  });
}
