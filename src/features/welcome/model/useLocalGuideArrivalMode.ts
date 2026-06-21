'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isWithinArrivalWindow,
  persistExploreUnlocked,
  readExploreUnlocked,
} from './resolveArrivalWindow';

export function useLocalGuideArrivalMode(checkInAt: string | null, stayId: string | null) {
  const [exploreUnlocked, setExploreUnlocked] = useState(false);
  const [utilitiesExpanded, setUtilitiesExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setExploreUnlocked(readExploreUnlocked(stayId));
    setHydrated(true);
  }, [stayId]);

  const inArrivalWindow = isWithinArrivalWindow(checkInAt);
  const isArrivalMode = Boolean(stayId && checkInAt && inArrivalWindow && !exploreUnlocked);

  useEffect(() => {
    if (isArrivalMode) {
      setUtilitiesExpanded(true);
    }
  }, [isArrivalMode]);

  const unlockExplore = useCallback(() => {
    setExploreUnlocked(true);
    if (stayId) {
      persistExploreUnlocked(stayId);
    }
  }, [stayId]);

  return {
    isArrivalMode,
    exploreUnlocked,
    utilitiesExpanded,
    setUtilitiesExpanded,
    unlockExplore,
    hydrated,
  };
}
