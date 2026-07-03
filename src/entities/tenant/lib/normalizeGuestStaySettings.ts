import type { GuestStayConfig, TourismRegistrationConfig } from '../model/guestStay';
import type { TenantSettings } from '../model/settings';
import {
  DEFAULT_TOURISM_PROFILE_ID,
  getTourismRegistrationProfile,
  type TourismRegistrationProfile,
} from '@/features/guest-tourism-registration/model/tourismRegistrationProfiles';

export function resolveTourismRegistrationConfig(
  settings: TenantSettings | undefined
): TourismRegistrationConfig | undefined {
  const gs = settings?.guestStay;
  if (!gs) return undefined;

  if (gs.tourismRegistration?.enabled) {
    return gs.tourismRegistration;
  }

  if (gs.tourismRegistrationRequired === true) {
    return { enabled: true, profileId: DEFAULT_TOURISM_PROFILE_ID };
  }

  return undefined;
}

export function resolveTourismRegistrationRequired(
  settings: TenantSettings | undefined
): boolean {
  return resolveTourismRegistrationConfig(settings) !== undefined;
}

export function resolveTourismRegistrationProfile(
  settings: TenantSettings | undefined
): TourismRegistrationProfile | undefined {
  const config = resolveTourismRegistrationConfig(settings);
  if (!config) return undefined;
  return getTourismRegistrationProfile(config.profileId);
}

function guestStayHasRoomMapData(guestStay: GuestStayConfig): boolean {
  return (
    (guestStay.floors?.length ?? 0) > 0 ||
    (guestStay.rooms?.length ?? 0) > 0 ||
    (guestStay.beds?.length ?? 0) > 0
  );
}

function hasTourismConfig(guestStay: GuestStayConfig): boolean {
  if (guestStay.tourismRegistration?.enabled) return true;
  if (guestStay.tourismRegistrationRequired === true) return true;
  return false;
}

function buildTourismRegistration(
  guestStay: GuestStayConfig
): TourismRegistrationConfig | undefined {
  if (guestStay.tourismRegistration?.enabled) {
    return guestStay.tourismRegistration;
  }
  if (guestStay.tourismRegistrationRequired === true) {
    return { enabled: true, profileId: DEFAULT_TOURISM_PROFILE_ID };
  }
  return undefined;
}

function stripLegacyTourismFields(
  guestStay: GuestStayConfig
): GuestStayConfig {
  const { tourismRegistrationRequired: _omit, tourismRegistration: _omit2, ...rest } = guestStay;
  return rest;
}

export function normalizeGuestStayComplianceOnRead(
  guestStay: GuestStayConfig | undefined
): GuestStayConfig | undefined {
  if (!guestStay) {
    return undefined;
  }

  const tourism = buildTourismRegistration(guestStay);
  const stripped = stripLegacyTourismFields(guestStay);

  if (!guestStayHasRoomMapData(stripped) && !tourism) {
    return undefined;
  }

  if (!tourism) {
    return guestStayHasRoomMapData(stripped) ? stripped : undefined;
  }

  return { ...stripped, tourismRegistration: tourism };
}

export function finalizeGuestStayForSave(input: {
  roomMapEnabled: boolean;
  guestStay: GuestStayConfig | undefined;
  tourismRegistrationRequired: boolean;
  tourismProfileId?: string;
}): TenantSettings['guestStay'] {
  const { roomMapEnabled, tourismRegistrationRequired } = input;
  const profileId = input.tourismProfileId ?? DEFAULT_TOURISM_PROFILE_ID;
  let guestStay = input.guestStay;

  const tourismRegistration: TourismRegistrationConfig | undefined =
    tourismRegistrationRequired ? { enabled: true, profileId } : undefined;

  if (!roomMapEnabled) {
    guestStay = tourismRegistration
      ? { tourismRegistration }
      : undefined;
    return normalizeGuestStayComplianceOnRead(guestStay);
  }

  if (!guestStay) {
    return tourismRegistration ? { tourismRegistration } : undefined;
  }

  const stripped = stripLegacyTourismFields(guestStay);

  if (tourismRegistration) {
    guestStay = { ...stripped, tourismRegistration };
  } else {
    guestStay = stripped;
  }

  return normalizeGuestStayComplianceOnRead(guestStay);
}
