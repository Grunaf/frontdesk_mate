import type { CityPackGateSnapshot } from '@/entities/city-pack';
import {
  isCityPackReadyForTenant,
  resolveCityPackHasPlacesForTenant,
  resolveCityPackNotReadyReasonForTenant,
} from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import { resolveHouseRulesReadyDetail } from '@/entities/house-rules';
import { hasPlacesPack, type CityPackId } from '@/entities/hostel';
import type { ModuleStatus } from '../model/capabilities';
import type { TenantSettings } from '../model/settings';
import { isRoomMapModuleEnabled } from './resolveGuestModuleToggles';
import { resolveCapabilities } from './resolveCapabilities';
import { getFirstRoomMapReadinessGap } from './resolveRoomMapReadiness';
import type { TenantReadinessSectionId } from './resolveTenantReadiness';

export type GuestAppModuleId = 'roomMap' | 'houseRules' | 'localGuide';

export interface GuestAppModuleStatus {
  id: GuestAppModuleId;
  label: string;
  status: ModuleStatus;
  detail?: string;
  actionSectionId?: TenantReadinessSectionId;
}

function resolveRoomMapDetail(settings: TenantSettings): string | undefined {
  if (!isRoomMapModuleEnabled(settings)) {
    return 'Enable room map below — partial setup is hidden from guests';
  }
  return getFirstRoomMapReadinessGap(settings);
}

export function resolveGuestAppModules(input: {
  cityPackId: CityPackId;
  settings: TenantSettings;
  cityPackHasPlaces?: boolean;
  cityPackGateSnapshot?: CityPackGateSnapshot;
}): GuestAppModuleStatus[] {
  const { cityPackId, settings, cityPackGateSnapshot } = input;
  const cityPackHasPlaces =
    input.cityPackHasPlaces ??
    (cityPackGateSnapshot
      ? resolveCityPackHasPlacesForTenant(cityPackId, cityPackGateSnapshot)
      : undefined);
  const capabilities = resolveCapabilities({
    cityPackId,
    settings,
    cityPackHasPlaces,
  });

  return [
    {
      id: 'roomMap',
      label: 'Room map',
      status: capabilities.roomMap,
      detail: capabilities.roomMap === 'ready' ? undefined : resolveRoomMapDetail(settings),
    },
    {
      id: 'houseRules',
      label: 'House rules',
      status: capabilities.faq,
      detail:
        capabilities.faq === 'ready'
          ? undefined
          : capabilities.faq === 'preview'
            ? resolveHouseRulesReadyDetail(settings) ?? 'Add at least one house rule'
            : 'Add house rules below — empty rules are hidden from guests',
    },
    {
      id: 'localGuide',
      label: 'Local guide',
      status: capabilities.localGuide,
      detail:
        capabilities.localGuide === 'ready'
          ? undefined
          : cityPackGateSnapshot
            ? (resolveCityPackNotReadyReasonForTenant(cityPackId, cityPackGateSnapshot) ?? undefined)
            : 'City pack is not ready — change City pack in Identity',
      actionSectionId: capabilities.localGuide === 'ready' ? undefined : 'identity',
    },
  ];
}

export function isGuestAppModuleReady(
  moduleId: GuestAppModuleId,
  input: {
    cityPackId: CityPackId;
    settings: TenantSettings;
    cityPackHasPlaces?: boolean;
    cityPackGateSnapshot?: CityPackGateSnapshot;
  }
): boolean {
  const module = resolveGuestAppModules(input).find((entry) => entry.id === moduleId);
  return module?.status === 'ready';
}

export function hasGuestAppPlacesPack(
  cityPackId: CityPackId,
  gateSnapshot?: CityPackGateSnapshot
): boolean {
  if (gateSnapshot) {
    return resolveCityPackHasPlacesForTenant(cityPackId, gateSnapshot);
  }
  return hasPlacesPack(cityPackId);
}
