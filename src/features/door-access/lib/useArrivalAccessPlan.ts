'use client';

import { useNightMode } from '@/shared/lib';
import { resolveArrivalAccessPlan, useHostelConfig, useTenant } from '@/entities/tenant';

export function useArrivalAccessPlan() {
  const hostel = useHostelConfig();
  const { settings } = useTenant();
  const isNightMode = useNightMode();

  return resolveArrivalAccessPlan(settings, hostel, isNightMode);
}
