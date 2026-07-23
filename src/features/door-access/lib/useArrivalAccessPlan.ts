'use client';

import { useEffect, useState } from 'react';
import {
  isOutsideReceptionHours,
  resolveArrivalAccessPlan,
  useHostelConfig,
  useTenant,
} from '@/entities/tenant';

type NightModeOverride = 'day' | 'night' | null;

function readNightModeOverride(): NightModeOverride {
  const value = process.env.NEXT_PUBLIC_NIGHT_MODE_OVERRIDE?.trim().toLowerCase();
  if (value === 'day' || value === 'night') return value;
  return null;
}

/**
 * Arrival Access & Doors night mode = outside reception hours (property TZ).
 * Override via `NEXT_PUBLIC_NIGHT_MODE_OVERRIDE=day|night` for QA.
 */
export function useArrivalAccessPlan() {
  const hostel = useHostelConfig();
  const { settings, guestBedId } = useTenant();
  const override = readNightModeOverride();
  const open = settings.reception?.open;
  const close = settings.reception?.close;
  const propertyTimeZone = settings.propertyTimeZone;

  const [isNightMode, setIsNightMode] = useState(() => {
    if (override === 'night') return true;
    if (override === 'day') return false;
    return isOutsideReceptionHours(open, close, new Date(), propertyTimeZone);
  });

  useEffect(() => {
    if (override === 'night') {
      setIsNightMode(true);
      return;
    }
    if (override === 'day') {
      setIsNightMode(false);
      return;
    }

    const checkTime = () => {
      setIsNightMode(isOutsideReceptionHours(open, close, new Date(), propertyTimeZone));
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [open, close, propertyTimeZone, override]);

  return {
    plan: resolveArrivalAccessPlan(settings, hostel, isNightMode, guestBedId),
    isNightMode,
  };
}
