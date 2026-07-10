'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

type RoutePendingContextValue = {
  isRoutePending: boolean;
  beginRouteTransition: () => void;
};

const RoutePendingContext = createContext<RoutePendingContextValue | null>(null);

function RoutePendingBar({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-primary',
        'animate-pulse motion-reduce:animate-none'
      )}
    />
  );
}

export function RoutePendingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isRoutePending, setRoutePending] = useState(false);

  useEffect(() => {
    setRoutePending(false);
  }, [pathname]);

  const beginRouteTransition = useCallback(() => {
    setRoutePending(true);
  }, []);

  const value = useMemo(
    () => ({ isRoutePending, beginRouteTransition }),
    [beginRouteTransition, isRoutePending]
  );

  return (
    <RoutePendingContext.Provider value={value}>
      <RoutePendingBar active={isRoutePending} />
      {children}
    </RoutePendingContext.Provider>
  );
}

export function useRoutePending() {
  return useContext(RoutePendingContext);
}
