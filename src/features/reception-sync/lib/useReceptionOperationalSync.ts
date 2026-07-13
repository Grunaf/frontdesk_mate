'use client';

import { useCallback, useState } from 'react';
import type { ReceptionOperationalContext } from '../model/receptionOperationalContext';
import { fetchReceptionOperationalContext } from './fetchReceptionOperationalContext';

export function useReceptionOperationalSync(
  initialContext: ReceptionOperationalContext,
  _tenantSlug: string
) {
  const [context, setContext] = useState(initialContext);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (): Promise<ReceptionOperationalContext | null> => {
    setIsRefreshing(true);

    try {
      const result = await fetchReceptionOperationalContext();

      if (!result.ok) {
        if (result.error === 'unauthorized' && typeof window !== 'undefined') {
          window.location.assign('/login');
        }
        return null;
      }

      setContext(result.context);
      return result.context;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    context,
    refresh,
    isRefreshing,
  };
}
