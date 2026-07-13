'use client';

import { useEffect } from 'react';
import { registerReceptionServiceWorker } from '../lib/receptionPwaClient';
import { dispatchReceptionRefresh } from '@/features/reception-sync/lib/receptionRefreshEvents';

export function ReceptionPwaBootstrap() {
  useEffect(() => {
    void registerReceptionServiceWorker();
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const onServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || data.type !== 'reception:refresh') {
        return;
      }

      dispatchReceptionRefresh({
        refresh: data.refresh === 'context' || data.refresh == null ? 'context' : data.refresh,
      });
    };

    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage);
    };
  }, []);

  return null;
}
