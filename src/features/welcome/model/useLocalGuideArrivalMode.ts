'use client';

import { useTenant } from '@/entities/tenant';
import { isWithinArrivalWindow } from './resolveArrivalWindow';

export function useLocalGuideArrivalMode(checkInAt: string | null, stayId: string | null) {
  const { hostel } = useTenant();
  const inArrivalWindow = isWithinArrivalWindow(checkInAt, new Date(), hostel.propertyTimeZone);
  const isArrivalMode = Boolean(stayId && checkInAt && inArrivalWindow);

  return {
    isArrivalMode,
  };
}
