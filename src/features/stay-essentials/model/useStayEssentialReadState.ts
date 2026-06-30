'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGuestSession } from '@/features/guest-check-in';
import { buildStayEssentialsReadStorageKey } from './buildStayEssentialsReadStorageKey';
import { persistStayEssentialRead, readStayEssentialRead } from './stayEssentialReadStorage';
import type { StayEssentialBridgeId } from './types';

export function useStayEssentialReadState(bridgeId: StayEssentialBridgeId) {
  const { session, currentTenantSlug } = useGuestSession();
  const stayId = session?.stayId ?? null;

  const storageKey = useMemo(() => {
    if (!currentTenantSlug || !stayId) {
      return null;
    }

    return buildStayEssentialsReadStorageKey(currentTenantSlug, stayId, bridgeId);
  }, [bridgeId, currentTenantSlug, stayId]);

  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setIsRead(false);
      return;
    }

    setIsRead(readStayEssentialRead(storageKey));
  }, [storageKey]);

  const markRead = useCallback(() => {
    if (!storageKey) {
      return;
    }

    persistStayEssentialRead(storageKey);
    setIsRead(true);
  }, [storageKey]);

  return { isRead, markRead };
}
