'use client';

import { useEffect, useRef, useState } from 'react';

export const APP_HEADER_SCROLL_TOP_THRESHOLD_PX = 16;
export const APP_HEADER_SCROLL_MIN_DELTA_PX = 8;

export function readAppHeaderScrollOffset(scrollRoot: HTMLElement | null | undefined): number {
  return scrollRoot?.scrollTop ?? window.scrollY;
}

export function resolveAppHeaderVisibilityFromScroll(input: {
  scrollY: number;
  previousScrollY: number;
  currentlyVisible: boolean;
}): { visible: boolean; nextScrollY: number } {
  const { scrollY, previousScrollY, currentlyVisible } = input;

  if (scrollY <= APP_HEADER_SCROLL_TOP_THRESHOLD_PX) {
    return { visible: true, nextScrollY: scrollY };
  }

  const delta = scrollY - previousScrollY;

  if (Math.abs(delta) < APP_HEADER_SCROLL_MIN_DELTA_PX) {
    return { visible: currentlyVisible, nextScrollY: scrollY };
  }

  if (delta > 0) {
    return { visible: false, nextScrollY: scrollY };
  }

  return { visible: true, nextScrollY: scrollY };
}

export function useAppHeaderScrollVisibility({
  enabled,
  resetKey,
  scrollRoot,
}: {
  enabled: boolean;
  resetKey: string;
  scrollRoot: HTMLElement | null;
}): { visible: boolean } {
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const visibleRef = useRef(true);

  useEffect(() => {
    visibleRef.current = true;
    setVisible(true);
    lastScrollYRef.current = readAppHeaderScrollOffset(scrollRoot);
  }, [resetKey, scrollRoot]);

  useEffect(() => {
    if (!enabled) {
      visibleRef.current = true;
      setVisible(true);
      return;
    }

    const handleScroll = () => {
      const scrollY = readAppHeaderScrollOffset(scrollRoot);
      const result = resolveAppHeaderVisibilityFromScroll({
        scrollY,
        previousScrollY: lastScrollYRef.current,
        currentlyVisible: visibleRef.current,
      });

      lastScrollYRef.current = result.nextScrollY;

      if (result.visible !== visibleRef.current) {
        visibleRef.current = result.visible;
        setVisible(result.visible);
      }
    };

    lastScrollYRef.current = readAppHeaderScrollOffset(scrollRoot);
    const target: HTMLElement | Window = scrollRoot ?? window;
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, scrollRoot]);

  return { visible: enabled ? visible : true };
}
