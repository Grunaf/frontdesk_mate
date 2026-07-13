'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  randomOperationalRolloverJitterMs,
  scheduleNextRolloverAt,
} from './scheduleOperationalRollover';

const VISIBILITY_REFRESH_DEBOUNCE_MS = 2000;

export type UseReceptionOperationalRolloverOptions = {
  onRollover?: () => void;
};

export function useReceptionOperationalRollover(
  endsAt: string,
  refresh: () => Promise<unknown>,
  options?: UseReceptionOperationalRolloverOptions
) {
  const [rolloverEpoch, setRolloverEpoch] = useState(0);
  const refreshRef = useRef(refresh);
  const onRolloverRef = useRef(options?.onRollover);

  refreshRef.current = refresh;
  onRolloverRef.current = options?.onRollover;

  const runRolloverRefresh = useCallback(async () => {
    await refreshRef.current();
    setRolloverEpoch((epoch) => epoch + 1);
    onRolloverRef.current?.();
  }, []);

  useEffect(() => {
    const jitterMs = randomOperationalRolloverJitterMs();
    const schedule = scheduleNextRolloverAt(endsAt, new Date(), jitterMs);
    if (!schedule) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void runRolloverRefresh();
    }, schedule.delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [endsAt, runRolloverRefresh]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }

      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void refreshRef.current();
      }, VISIBILITY_REFRESH_DEBOUNCE_MS);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
    };
  }, []);

  return { rolloverEpoch };
}
