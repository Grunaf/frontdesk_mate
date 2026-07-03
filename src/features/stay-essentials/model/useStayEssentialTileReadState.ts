'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGuestSession } from '@/features/guest-check-in';
import type { StayEssentialReadTileId } from './buildStayEssentialsReadStorageKey';
import {
  migratePreCheckInStayEssentialReads,
  resolveStayEssentialReadStorageKey,
} from './migratePreCheckInStayEssentialReads';
import { persistStayEssentialRead, readStayEssentialRead } from './stayEssentialReadStorage';

const migratedStayKeys = new Set<string>();

function ensurePreCheckInReadsMigrated(tenantSlug: string, stayId: string): void {
  const cacheKey = `${tenantSlug}:${stayId}`;
  if (migratedStayKeys.has(cacheKey)) {
    return;
  }

  migratedStayKeys.add(cacheKey);
  migratePreCheckInStayEssentialReads(tenantSlug, stayId);
}

export function useStayEssentialTileReadState(tileId: StayEssentialReadTileId) {
  const { session, currentTenantSlug } = useGuestSession();
  const stayId = session?.stayId ?? null;

  const storageKey = useMemo(() => {
    if (!currentTenantSlug) {
      return null;
    }

    return resolveStayEssentialReadStorageKey({
      tenantSlug: currentTenantSlug,
      stayId,
      tileId,
    });
  }, [currentTenantSlug, stayId, tileId]);

  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    if (!currentTenantSlug || !stayId) {
      return;
    }

    ensurePreCheckInReadsMigrated(currentTenantSlug, stayId);
  }, [currentTenantSlug, stayId]);

  useEffect(() => {
    if (!storageKey || !currentTenantSlug) {
      setIsRead(false);
      return;
    }

    setIsRead(readStayEssentialRead(storageKey));
  }, [storageKey, currentTenantSlug, stayId]);

  const markRead = useCallback(() => {
    if (!storageKey) {
      return;
    }

    persistStayEssentialRead(storageKey);
    setIsRead(true);
  }, [storageKey]);

  return { isRead, markRead };
}
