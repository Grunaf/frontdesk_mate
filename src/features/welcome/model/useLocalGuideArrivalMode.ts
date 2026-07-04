'use client';

import { isWithinArrivalWindow } from './resolveArrivalWindow';

export function useLocalGuideArrivalMode(checkInAt: string | null, stayId: string | null) {
  const inArrivalWindow = isWithinArrivalWindow(checkInAt);
  const isArrivalMode = Boolean(stayId && checkInAt && inArrivalWindow);

  return {
    isArrivalMode,
  };
}
