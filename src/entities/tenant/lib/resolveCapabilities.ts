import type { CityPackId } from '@/entities/hostel';
import type { ModuleStatus, TenantCapabilities } from '../model/capabilities';
import { resolveHouseRulesReady } from '@/entities/house-rules';
import type { TenantSettings } from '../model/settings';
import { hasDoorAccessConfigured, hasNightDoorCodes } from './resolveArrivalAccessPlan';
import { normalizeAccessPoints, resolveArrivalLandmark } from './normalizeAccessPoints';
import {
  isHouseRulesModuleTracked,
  isRoomMapModuleEnabled,
} from './resolveGuestModuleToggles';
import { hasLandingContent } from './resolveLandingRooms';
import { resolveBookingConfig } from './resolveBookingConfig';
import { isRoomMapReady } from './resolveRoomMapReadiness';
import { isTenantLeadGenLanding, type TenantLifecycleStatus } from './resolveTenantLifecycle';

function hasBooking(settings: TenantSettings): boolean {
  return resolveBookingConfig(settings).enabled;
}

function hasLandingAssets(settings: TenantSettings): boolean {
  return hasLandingContent(settings);
}

function resolveRoomMapStatus(settings: TenantSettings): ModuleStatus {
  if (!isRoomMapModuleEnabled(settings)) {
    return 'hidden';
  }

  return isRoomMapReady(settings) ? 'ready' : 'preview';
}

function resolveHouseRulesStatus(settings: TenantSettings): ModuleStatus {
  if (!isHouseRulesModuleTracked(settings)) {
    return 'hidden';
  }

  return resolveHouseRulesReady(settings).ready ? 'ready' : 'preview';
}

function resolveLocalGuideStatus(cityPackHasPlaces?: boolean): ModuleStatus {
  return cityPackHasPlaces === true ? 'ready' : 'hidden';
}

function resolveArrivalRoutesStatus(cityPackHasPlaces?: boolean): ModuleStatus {
  return cityPackHasPlaces === true ? 'ready' : 'hidden';
}

export function resolveCapabilities(input: {
  cityPackId: CityPackId;
  settings: TenantSettings;
  lifecycleStatus?: TenantLifecycleStatus;
  cityPackHasPlaces?: boolean;
}): TenantCapabilities {
  const { settings, lifecycleStatus = 'active', cityPackHasPlaces } = input;
  const bookingReady = hasBooking(settings) && !isTenantLeadGenLanding(lifecycleStatus);

  return {
    arrivalRoutes: resolveArrivalRoutesStatus(cityPackHasPlaces),
    preTripInfo: settings.checkInTime ? 'ready' : 'preview',
    doorAccess: hasDoorAccessConfigured(settings) ? 'ready' : 'hidden',
    doorPhotos:
      resolveArrivalLandmark(settings) ||
      normalizeAccessPoints(settings).some((point) => point.image) ||
      hasNightDoorCodes(settings)
        ? 'ready'
        : 'hidden',
    roomMap: resolveRoomMapStatus(settings),
    localGuide: resolveLocalGuideStatus(cityPackHasPlaces),
    nightAccess: hasNightDoorCodes(settings) ? 'ready' : 'hidden',
    faq: resolveHouseRulesStatus(settings),
    memories: 'ready',
    landing: hasLandingAssets(settings) ? 'ready' : 'hidden',
    booking: bookingReady ? 'ready' : 'hidden',
  };
}
