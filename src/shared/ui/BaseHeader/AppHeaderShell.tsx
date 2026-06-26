'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { getCleanPath } from '@/shared/config';
import { cn } from '@/shared/lib/utils';
import { resolveAppHeaderMode, shouldAutoHideAppHeader } from './resolveAppHeaderMode';
import { useAppHeaderScrollVisibility } from './useAppHeaderScrollVisibility';

interface AppHeaderShellProps {
  children: ReactNode;
}

export function AppHeaderShell({ children }: AppHeaderShellProps) {
  const pathname = usePathname();
  const cleanPath = getCleanPath(pathname);
  const headerMode = resolveAppHeaderMode(cleanPath);
  const autoHideEnabled = shouldAutoHideAppHeader(headerMode);
  const { visible } = useAppHeaderScrollVisibility({
    enabled: autoHideEnabled,
    resetKey: cleanPath,
  });

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(media.matches);
    updateMotionPreference();
    media.addEventListener('change', updateMotionPreference);

    return () => {
      media.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      setHeaderHeight(node.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [children, cleanPath]);

  return (
    <>
      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />
      <div
        ref={headerRef}
        className={cn(
          'fixed top-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-b border-border bg-card',
          !prefersReducedMotion && 'transition-transform duration-200 ease-out',
          visible ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        {children}
      </div>
    </>
  );
}
