export type WindowScrollPosition = {
  x: number;
  y: number;
};

export function readWindowScrollPosition(): WindowScrollPosition {
  return { x: window.scrollX, y: window.scrollY };
}

/** Pure: whether saved page scroll differs from current beyond tolerance. */
export function shouldRestoreWindowScroll(
  saved: WindowScrollPosition,
  current: WindowScrollPosition,
  tolerancePx = 1
): boolean {
  return (
    Math.abs(saved.x - current.x) > tolerancePx ||
    Math.abs(saved.y - current.y) > tolerancePx
  );
}

export function restoreWindowScrollPosition(saved: WindowScrollPosition): void {
  if (!shouldRestoreWindowScroll(saved, readWindowScrollPosition())) {
    return;
  }
  window.scrollTo(saved.x, saved.y);
}

/**
 * Restore after React commit/paint. Call immediately before setState that may
 * reflow the desk page and reset window scroll.
 */
export function scheduleWindowScrollRestore(saved: WindowScrollPosition): void {
  const restore = () => restoreWindowScrollPosition(saved);
  queueMicrotask(restore);
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}

/** Capture scroll, run sync update (typically setState), then restore after paint. */
export function runWithPreservedWindowScroll(update: () => void): void {
  if (typeof window === 'undefined') {
    update();
    return;
  }
  const saved = readWindowScrollPosition();
  update();
  scheduleWindowScrollRestore(saved);
}
