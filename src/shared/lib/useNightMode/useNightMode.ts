'use client';
import { is } from 'date-fns/locale';
import { useState, useEffect } from 'react';

export function useNightMode(startHour = 23, endHour = 8) {
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const currentHour = new Date().getHours();
      setIsNightMode(currentHour >= startHour || currentHour < endHour);
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [startHour, endHour]);

  return false;
}
