'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { useAppHeaderScroll } from './AppHeaderScrollContext';

interface AppHeaderShellProps {
  children: ReactNode;
}

export function AppHeaderShell({ children }: AppHeaderShellProps) {
  const { visible, headerHeight, setHeaderHeight, prefersReducedMotion } = useAppHeaderScroll();

  const headerRef = useRef<HTMLDivElement>(null);

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
  }, [children, setHeaderHeight]);

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
