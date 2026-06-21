'use client';

import { useState, useEffect } from 'react';

type NightModeOverride = 'day' | 'night' | null;

function readNightModeOverride(): NightModeOverride {
  const value = process.env.NEXT_PUBLIC_NIGHT_MODE_OVERRIDE?.trim().toLowerCase();
  if (value === 'day' || value === 'night') return value;
  return null;
}

function computeNightMode(startHour: number, endHour: number): boolean {
  const currentHour = new Date().getHours();
  return currentHour >= startHour || currentHour < endHour;
}

export function useNightMode(startHour = 23, endHour = 8) {
  const override = readNightModeOverride();
  const [isNightMode, setIsNightMode] = useState(() => {
    if (override === 'night') return true;
    if (override === 'day') return false;
    return computeNightMode(startHour, endHour);
  });

  useEffect(() => {
    if (override) return;

    const checkTime = () => {
      setIsNightMode(computeNightMode(startHour, endHour));
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [startHour, endHour, override]);

  if (override === 'night') return true;
  if (override === 'day') return false;
  return isNightMode;
}
