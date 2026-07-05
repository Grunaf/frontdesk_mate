'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { getCleanPath } from '@/shared/config';
import {
  resolveAppHeaderMode,
  shouldAutoHideAppHeader,
  shouldAutoHideArrivalGuideSteps,
} from './resolveAppHeaderMode';
import { useAppHeaderScrollVisibility } from './useAppHeaderScrollVisibility';

export const APP_HEADER_HEIGHT_CSS_VAR = '--app-header-height';

interface AppHeaderScrollContextValue {
  headerVisible: boolean;
  guideStepsVisible: boolean;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  prefersReducedMotion: boolean;
  guideStepsAutoHideEnabled: boolean;
  registerScrollRoot: (element: HTMLElement | null) => void;
}

const AppHeaderScrollContext = createContext<AppHeaderScrollContextValue | null>(null);

export function AppHeaderScrollProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const cleanPath = getCleanPath(pathname);
  const headerMode = resolveAppHeaderMode(cleanPath);
  const headerAutoHideEnabled = shouldAutoHideAppHeader(headerMode);
  const guideStepsAutoHideEnabled = shouldAutoHideArrivalGuideSteps(headerMode);
  const scrollTrackingEnabled = headerAutoHideEnabled || guideStepsAutoHideEnabled;
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const registerScrollRoot = useCallback((element: HTMLElement | null) => {
    setScrollRoot(element);
  }, []);
  const { visible: scrollVisible } = useAppHeaderScrollVisibility({
    enabled: scrollTrackingEnabled,
    resetKey: cleanPath,
    scrollRoot,
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const headerVisible = headerAutoHideEnabled ? scrollVisible : true;
  const guideStepsVisible = guideStepsAutoHideEnabled ? scrollVisible : true;

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
    document.documentElement.style.setProperty(APP_HEADER_HEIGHT_CSS_VAR, `${headerHeight}px`);

    return () => {
      document.documentElement.style.removeProperty(APP_HEADER_HEIGHT_CSS_VAR);
    };
  }, [headerHeight]);

  const value = useMemo(
    () => ({
      headerVisible,
      guideStepsVisible,
      headerHeight,
      setHeaderHeight,
      prefersReducedMotion,
      guideStepsAutoHideEnabled,
      registerScrollRoot,
    }),
    [
      headerVisible,
      guideStepsVisible,
      headerHeight,
      prefersReducedMotion,
      guideStepsAutoHideEnabled,
      registerScrollRoot,
    ]
  );

  return (
    <AppHeaderScrollContext.Provider value={value}>{children}</AppHeaderScrollContext.Provider>
  );
}

export function useAppHeaderScroll(): AppHeaderScrollContextValue {
  const context = useContext(AppHeaderScrollContext);

  if (!context) {
    throw new Error('useAppHeaderScroll must be used within AppHeaderScrollProvider');
  }

  return context;
}
