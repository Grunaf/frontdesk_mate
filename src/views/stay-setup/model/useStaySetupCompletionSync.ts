'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';

export type StaySetupCompletionSyncStatus = {
  tourismComplete: boolean;
  contactComplete: boolean;
};

type UseStaySetupCompletionSyncOptions = {
  slug: string | undefined;
  isRegistered: boolean;
  staySetupPathSuffix: string;
  onStatus: (status: StaySetupCompletionSyncStatus) => void;
};

export function useStaySetupCompletionSync({
  slug,
  isRegistered,
  staySetupPathSuffix,
  onStatus,
}: UseStaySetupCompletionSyncOptions): void {
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const pathname = usePathname();
  const isOnStaySetup = pathname.includes(staySetupPathSuffix);

  const fetchStatus = useCallback(() => {
    if (!isRegistered || !slug || !isOnStaySetup) {
      return;
    }

    let cancelled = false;
    void getStaySetupStatusAction(slug).then((result) => {
      if (cancelled || !result.ok) {
        return;
      }
      onStatusRef.current({
        tourismComplete: result.status.tourismComplete,
        contactComplete: result.status.contactComplete,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isRegistered, isOnStaySetup, slug]);

  useEffect(() => {
    return fetchStatus();
  }, [fetchStatus, pathname]);

  useEffect(() => {
    if (!isOnStaySetup) {
      return;
    }

    const onFocus = () => {
      fetchStatus();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchStatus, isOnStaySetup]);
}
