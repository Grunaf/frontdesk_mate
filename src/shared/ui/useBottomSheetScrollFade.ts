'use client';

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

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

export function useBottomSheetScrollFade(
  scrollRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  contentDependency?: unknown
): BottomSheetScrollFadeState {
  const [state, setState] = useState<BottomSheetScrollFadeState>({
    canScrollUp: false,
    canScrollDown: false,
  });

  const update = useCallback(() => {
    const element = scrollRef.current;

    if (!element || !enabled) {
      setState({ canScrollUp: false, canScrollDown: false });
      return;
    }

    setState(measureScrollFade(element));
  }, [enabled, scrollRef]);

  useLayoutEffect(() => {
    update();
  }, [update, contentDependency]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const element = scrollRef.current;

    if (!element) {
      return;
    }

    element.addEventListener('scroll', update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);

    for (const child of element.children) {
      resizeObserver.observe(child);
    }

    return () => {
      element.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
  }, [contentDependency, enabled, scrollRef, update]);

  return state;
}
