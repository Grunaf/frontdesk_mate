'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useStayEssentialsConciergeBannerSlot } from '../lib/useStayEssentialsConciergeBannerSlot';
import type { StayEssentialsConciergeBannerSlot } from '../lib/useStayEssentialsConciergeBannerSlot';
import { StayEssentialsConciergeBannerLayout } from './StayEssentialsConciergeBannerLayout';

const StayEssentialsConciergeBannerContext =
  createContext<StayEssentialsConciergeBannerSlot | null>(null);

export function useStayEssentialsConciergeBannerContext(): StayEssentialsConciergeBannerSlot | null {
  return useContext(StayEssentialsConciergeBannerContext);
}

type StayEssentialsConciergeBannerRootProps = {
  children: ReactNode;
};

/** One skeleton slot for concierge pre-check-in / settlement banners (status from StaySetupStatusProvider). */
export function StayEssentialsConciergeBannerRoot({ children }: StayEssentialsConciergeBannerRootProps) {
  const slot = useStayEssentialsConciergeBannerSlot();

  return (
    <StayEssentialsConciergeBannerContext.Provider value={slot}>
      {slot.kind === 'loading' ? (
        <StayEssentialsConciergeBannerLayout variant="skeleton" testId="stay-banner-skeleton" />
      ) : null}
      {children}
    </StayEssentialsConciergeBannerContext.Provider>
  );
}
