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
import { resolveAppHeaderMode, shouldAutoHideAppHeader } from './resolveAppHeaderMode';
import { useAppHeaderScrollVisibility } from './useAppHeaderScrollVisibility';

export const APP_HEADER_HEIGHT_CSS_VAR = '--app-header-height';

interface AppHeaderScrollContextValue {
  visible: boolean;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  prefersReducedMotion: boolean;
  autoHideEnabled: boolean;
  /** When true, header stays visible (auto-hide ignored). */
  setSuppressAutoHide: (suppress: boolean) => void;
}

const AppHeaderScrollContext = createContext<AppHeaderScrollContextValue | null>(null);

export function AppHeaderScrollProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const cleanPath = getCleanPath(pathname);
  const headerMode = resolveAppHeaderMode(cleanPath);
  const autoHideEnabled = shouldAutoHideAppHeader(headerMode);
  const { visible: scrollVisible } = useAppHeaderScrollVisibility({
    enabled: autoHideEnabled,
    resetKey: cleanPath,
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [suppressAutoHide, setSuppressAutoHideState] = useState(false);

  const setSuppressAutoHide = useCallback((suppress: boolean) => {
    setSuppressAutoHideState(suppress);
  }, []);

  const visible = suppressAutoHide ? true : autoHideEnabled ? scrollVisible : true;

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
      visible,
      headerHeight,
      setHeaderHeight,
      prefersReducedMotion,
      autoHideEnabled,
      setSuppressAutoHide,
    }),
    [visible, headerHeight, prefersReducedMotion, autoHideEnabled, setSuppressAutoHide]
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
