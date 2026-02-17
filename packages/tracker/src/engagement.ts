/**
 * Engaged time tracking — only counts time when tab is active/visible
 */

let engagedTime = 0;
let lastActiveTs = 0;
let isActive = true;

export function getEngagedTime(): number {
  if (isActive && lastActiveTs > 0) {
    return engagedTime + (Date.now() - lastActiveTs);
  }
  return engagedTime;
}

export function trackEngagement(): void {
  lastActiveTs = Date.now();
  isActive = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab went to background
      if (isActive && lastActiveTs > 0) {
        engagedTime += Date.now() - lastActiveTs;
      }
      isActive = false;
    } else {
      // Tab came to foreground
      isActive = true;
      lastActiveTs = Date.now();
    }
  });
}

export function resetEngagement(): void {
  engagedTime = 0;
  lastActiveTs = Date.now();
  isActive = !document.hidden;
}
