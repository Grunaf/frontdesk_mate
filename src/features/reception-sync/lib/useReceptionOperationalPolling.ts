'use client';

import { useEffect, useRef } from 'react';

const VISIBLE_POLL_INTERVAL_MS = 60_000;

export function useReceptionOperationalPolling(refresh: () => Promise<unknown>): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    let intervalId: number | undefined;

    const syncInterval = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }

      if (document.visibilityState !== 'visible') {
        return;
      }

      intervalId = window.setInterval(() => {
        void refreshRef.current();
      }, VISIBLE_POLL_INTERVAL_MS);
    };

    syncInterval();
    document.addEventListener('visibilitychange', syncInterval);

    return () => {
      document.removeEventListener('visibilitychange', syncInterval);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);
}
