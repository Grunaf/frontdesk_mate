'use client';

import { useContext, useMemo } from 'react';
import { useLocale } from '@/shared/i18n';
import { useTenantCityPack } from '../model/tenant-config';
import { resolveGuestStayPlan } from '../lib/resolveGuestStayPlan';
import { useGuestRuntimeBedId } from './GuestRuntimeProvider';
import { TenantContext } from './tenant-context';
import type { AppLocale } from '@/entities/city-pack/model/types';
import type { ModuleStatus } from '../model/capabilities';

function resolveGuestRoomMapCapability(
  tenantRoomMap: ModuleStatus,
  settings: import('../model/settings').TenantSettings,
  guestBedId: string | null
): ModuleStatus {
  if (tenantRoomMap === 'hidden') {
    return 'hidden';
  }

  if (!guestBedId) {
    return 'hidden';
  }

  const plan = resolveGuestStayPlan(settings, guestBedId);
  if (
    plan.bedId &&
    (plan.layoutBeds.length > 0 || plan.room?.doorImage || plan.floor?.pathHint || plan.floor?.pathImage)
  ) {
    return 'ready';
  }

  return tenantRoomMap === 'ready' ? 'preview' : tenantRoomMap;
}

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
  const locale = useLocale() as AppLocale;
  const cityPack = useTenantCityPack(
    context.cityPackId,
    locale,
    context.cityPackPlaces,
    context.cityPackEnabledRoutes,
    context.cityPackContent,
    context.cityPackStatus
  );

  const settings = context.settings;

  const capabilities = useMemo(() => {
    const roomMap = resolveGuestRoomMapCapability(
      context.capabilities.roomMap,
      settings,
      guestBedId
    );

    if (roomMap === context.capabilities.roomMap) {
      return context.capabilities;
    }

    return {
      ...context.capabilities,
      roomMap,
    };
  }, [context.capabilities, guestBedId, settings]);

  return {
    ...context,
    cityPack,
    settings,
    guestBedId,
    capabilities,
    routes: cityPack.routes,
    routeCategories: cityPack.categories,
    contentKeys: cityPack.contentKeys,
  };
}
