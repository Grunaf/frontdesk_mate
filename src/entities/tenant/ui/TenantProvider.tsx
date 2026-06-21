'use client';

import { useContext, useMemo } from 'react';
import { useTenantCityPack } from '../model/tenant-config';
import { resolveCapabilities } from '../lib/resolveCapabilities';
import { resolveGuestBedId } from '../lib/resolveGuestBedId';
import { resolveGuestStayPlan } from '../lib/resolveGuestStayPlan';
import { useGuestRuntimeBedId } from './GuestRuntimeProvider';
import { TenantContext } from './tenant-context';

export function TenantProvider({
  config,
  children,
}: {
  config: import('../model/tenant-config').TenantConfig;
  children: React.ReactNode;
}) {
  return <TenantContext.Provider value={config}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }

  const guestBedId = useGuestRuntimeBedId();
  const cityPack = useTenantCityPack(
    context.cityPackId,
    context.cityPackPlaces,
    context.cityPackEnabledRoutes
  );

  const settings = useMemo(() => {
    const effectiveBedId = resolveGuestBedId(context.settings, guestBedId);
    if (!effectiveBedId) {
      return context.settings;
    }

    return {
      ...context.settings,
      highlightedBedId: effectiveBedId,
    };
  }, [context.settings, guestBedId]);

  const capabilities = useMemo(() => {
    if (context.capabilities.roomMap === 'ready') {
      return context.capabilities;
    }

    const plan = resolveGuestStayPlan(settings);
    if (
      plan.bedId &&
      (plan.layoutBeds.length > 0 || plan.room?.doorImage || plan.floor?.pathHint || plan.floor?.pathImage)
    ) {
      return {
        ...context.capabilities,
        roomMap: 'ready' as const,
      };
    }

    if (!guestBedId) {
      return context.capabilities;
    }

    return resolveCapabilities({
      cityPackId: context.cityPackId,
      settings,
      lifecycleStatus: context.lifecycleStatus,
      cityPackHasPlaces: context.cityPackHasPlaces,
    });
  }, [context.capabilities, context.cityPackId, guestBedId, settings]);

  return {
    ...context,
    cityPack,
    settings,
    capabilities,
    routes: cityPack.routes,
    routeCategories: cityPack.categories,
    contentKeys: cityPack.contentKeys,
  };
}
