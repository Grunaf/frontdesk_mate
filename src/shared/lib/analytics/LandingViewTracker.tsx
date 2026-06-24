'use client';

import { useEffect } from 'react';
import { trackLandingView } from './events';

interface LandingViewTrackerProps {
  tenantSlug: string;
}

export function LandingViewTracker({ tenantSlug }: LandingViewTrackerProps) {
  useEffect(() => {
    trackLandingView(tenantSlug);
  }, [tenantSlug]);

  return null;
}
