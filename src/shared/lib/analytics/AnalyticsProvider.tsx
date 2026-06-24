'use client';

import { useEffect } from 'react';
import { initAnalytics } from './client';
import type { AnalyticsSite } from './types';

interface AnalyticsProviderProps {
  tenantSlug: string;
  site: AnalyticsSite;
  children: React.ReactNode;
}

export function AnalyticsProvider({ tenantSlug, site, children }: AnalyticsProviderProps) {
  useEffect(() => {
    initAnalytics(tenantSlug, site);
  }, [tenantSlug, site]);

  return children;
}
