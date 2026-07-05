'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { useAppHeaderScroll } from './AppHeaderScrollContext';

interface AppGuestScrollMainProps {
  children: ReactNode;
}

export function AppGuestScrollMain({ children }: AppGuestScrollMainProps) {
  const { registerScrollRoot } = useAppHeaderScroll();

  const ref = useCallback(
    (node: HTMLElement | null) => {
      registerScrollRoot(node);
    },
    [registerScrollRoot]
  );

  return (
    <main ref={ref} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {children}
    </main>
  );
}
