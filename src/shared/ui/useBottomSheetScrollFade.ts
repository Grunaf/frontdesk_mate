'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

const SCROLL_THRESHOLD_PX = 2;

export interface BottomSheetScrollFadeState {
  canScrollUp: boolean;
  canScrollDown: boolean;
}

function measureScrollFade(element: HTMLElement): BottomSheetScrollFadeState {
  const { scrollTop, clientHeight, scrollHeight } = element;

  return {
    canScrollUp: scrollTop > SCROLL_THRESHOLD_PX,
    canScrollDown: scrollTop + clientHeight < scrollHeight - SCROLL_THRESHOLD_PX,
  };
}

function sameScrollFadeState(
  a: BottomSheetScrollFadeState,
  b: BottomSheetScrollFadeState
): boolean {
  return a.canScrollUp === b.canScrollUp && a.canScrollDown === b.canScrollDown;
}

/**
 * Tracks whether a bottom-sheet body can scroll, for top/bottom fade hints.
 *
 * Remeasure via scroll + ResizeObserver on the container and MutationObserver
 * for content changes. Do not drive this from React `children` identity — that
 * retriggers every parent render and can loop with layout.
 */
export function useBottomSheetScrollFade(
  scrollRef: RefObject<HTMLDivElement | null>,
  enabled: boolean
): BottomSheetScrollFadeState {
  const [state, setState] = useState<BottomSheetScrollFadeState>({
    canScrollUp: false,
    canScrollDown: false,
  });
  const rafRef = useRef<number | null>(null);

  const applyMeasure = useCallback(() => {
    const element = scrollRef.current;

    if (!element || !enabled) {
      setState((prev) =>
        sameScrollFadeState(prev, { canScrollUp: false, canScrollDown: false })
          ? prev
          : { canScrollUp: false, canScrollDown: false }
      );
      return;
    }

    const next = measureScrollFade(element);
    setState((prev) => (sameScrollFadeState(prev, next) ? prev : next));
  }, [enabled, scrollRef]);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      applyMeasure();
    });
  }, [applyMeasure]);

  useLayoutEffect(() => {
    applyMeasure();
  }, [applyMeasure]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.addEventListener('scroll', scheduleUpdate, { passive: true });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(element);

    // Content growth often keeps the container border-box fixed; watch DOM
    // mutations instead of observing every child (avoids churn on re-render).
    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      element.removeEventListener('scroll', scheduleUpdate);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, scheduleUpdate, scrollRef]);

  return state;
}
