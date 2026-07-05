'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { useAppHeaderScroll } from '@/shared/ui';

interface ArrivalGuideStepsShellProps {
  children: ReactNode;
}

export function ArrivalGuideStepsShell({ children }: ArrivalGuideStepsShellProps) {
  const { visible, prefersReducedMotion, autoHideEnabled } = useAppHeaderScroll();
  const shellRef = useRef<HTMLDivElement>(null);
  const [shellHeight, setShellHeight] = useState(0);

  useLayoutEffect(() => {
    const node = shellRef.current;
    if (!node) {
      return;
    }

    const updateHeight = () => {
      setShellHeight(node.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [children]);

  if (!autoHideEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div aria-hidden className="shrink-0" style={{ height: shellHeight }} />
      <div
        ref={shellRef}
        className={cn(
          'fixed top-[var(--app-header-height,0px)] left-1/2 z-10 w-full max-w-md -translate-x-1/2 bg-background',
          !prefersReducedMotion && 'transition-transform duration-200 ease-out',
          visible
            ? 'translate-y-0'
            : '-translate-y-[calc(100%+var(--app-header-height,0px))]'
        )}
      >
        {children}
      </div>
    </>
  );
}
