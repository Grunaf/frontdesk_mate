'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/shared/ui';
import {
  isReceptionServiceWorkerSupported,
  readVapidPublicKey,
  registerReceptionServiceWorker,
  subscribeReceptionPush,
} from '../lib/receptionPwaClient';

const DISMISS_KEY = 'fdm_reception_push_opt_in_dismissed';

interface ReceptionPushOptInProps {
  tenantSlug: string;
}

export function ReceptionPushOptIn({ tenantSlug }: ReceptionPushOptInProps) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'enabled' | 'error'>('idle');

  useEffect(() => {
    if (!isReceptionServiceWorkerSupported() || !readVapidPublicKey()) {
      return;
    }

    if (Notification.permission === 'granted') {
      void (async () => {
        const registration = await registerReceptionServiceWorker();
        if (registration) {
          await subscribeReceptionPush(registration);
        }
      })();
      setStatus('enabled');
      return;
    }

    if (Notification.permission === 'denied') {
      return;
    }

    if (window.localStorage.getItem(DISMISS_KEY) === tenantSlug) {
      return;
    }

    setVisible(true);
  }, [tenantSlug]);

  const handleEnable = useCallback(async () => {
    setStatus('pending');
    const registration = await registerReceptionServiceWorker();
    if (!registration) {
      setStatus('error');
      return;
    }

    const result = await subscribeReceptionPush(registration);
    if (result.ok) {
      setStatus('enabled');
      setVisible(false);
      return;
    }

    setStatus('error');
  }, []);

  const handleDismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, tenantSlug);
    setVisible(false);
  }, [tenantSlug]);

  if (!visible || status === 'enabled') {
    return null;
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium">Enable desk notifications</p>
        <p className="text-sm text-muted-foreground">
          Get alerts when guests report issues or request transfers.
        </p>
        {status === 'error' && (
          <p className="text-sm text-destructive">Could not enable notifications. Try again.</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleDismiss}>
          Not now
        </Button>
        <Button type="button" size="sm" disabled={status === 'pending'} onClick={handleEnable}>
          {status === 'pending' ? 'Enabling…' : 'Enable'}
        </Button>
      </div>
    </div>
  );
}
