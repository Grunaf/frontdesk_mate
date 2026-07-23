import type {
  GuestStayConfig,
  TourismRegistrationConfig,
  TourismRegistrationDataController,
} from '../model/guestStay';
import type { TenantSettings } from '../model/settings';
import {
  DEFAULT_TOURISM_PROFILE_ID,
  getTourismRegistrationProfile,
  type TourismRegistrationProfile,
} from '@/features/guest-tourism-registration/model/tourismRegistrationProfiles';

function sanitizeDataController(
  input: TourismRegistrationDataController | undefined
): TourismRegistrationDataController | undefined {
  if (!input) return undefined;
  const legalName = input.legalName?.trim() || undefined;
  const address = input.address?.trim() || undefined;
  const email = input.email?.trim() || undefined;
  const phone = input.phone?.trim() || undefined;
  if (!legalName && !address && !email && !phone) return undefined;
  return { legalName, address, email, phone };
}

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

/** Plan lifecycle badges (arrival / checked-in / leaving / late). Default off. */
export function resolvePlanStayStatusEnabled(
  settings: TenantSettings | undefined
): boolean {
  return settings?.guestStay?.planStayStatusEnabled === true;
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

function applyPlanStayStatusFlag(
  guestStay: GuestStayConfig,
  enabled: boolean
): GuestStayConfig {
  if (enabled) {
    return { ...guestStay, planStayStatusEnabled: true };
  }
  const { planStayStatusEnabled: _omit, ...rest } = guestStay;
  return rest;
}

function guestStayHasPersistableContent(guestStay: GuestStayConfig): boolean {
  return (
    guestStayHasRoomMapData(guestStay) ||
    hasTourismConfig(guestStay) ||
    guestStay.planStayStatusEnabled === true
  );
}

export function normalizeGuestStayComplianceOnRead(
  guestStay: GuestStayConfig | undefined
): GuestStayConfig | undefined {
  if (!guestStay) {
    return undefined;
  }

  const tourism = buildTourismRegistration(guestStay);
  const stripped = stripLegacyTourismFields(guestStay);
  const withPlan = applyPlanStayStatusFlag(
    stripped,
    guestStay.planStayStatusEnabled === true
  );

  if (!guestStayHasPersistableContent({ ...withPlan, tourismRegistration: tourism })) {
    return undefined;
  }

  if (!tourism) {
    return guestStayHasPersistableContent(withPlan) ? withPlan : undefined;
  }

  return { ...withPlan, tourismRegistration: tourism };
}

function sanitizeEntryStampHelpImage(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function finalizeGuestStayForSave(input: {
  roomMapEnabled: boolean;
  guestStay: GuestStayConfig | undefined;
  tourismRegistrationRequired: boolean;
  tourismProfileId?: string;
  planStayStatusEnabled?: boolean;
  dataController?: TourismRegistrationDataController;
  entryStampHelpImage?: string;
}): TenantSettings['guestStay'] {
  const { roomMapEnabled, tourismRegistrationRequired } = input;
  const profileId = input.tourismProfileId ?? DEFAULT_TOURISM_PROFILE_ID;
  const planStayStatusEnabled = input.planStayStatusEnabled === true;
  const dataController = sanitizeDataController(input.dataController);
  const entryStampHelpImage = sanitizeEntryStampHelpImage(input.entryStampHelpImage);
  let guestStay = input.guestStay;

  const tourismRegistration: TourismRegistrationConfig | undefined = tourismRegistrationRequired
    ? {
        enabled: true,
        profileId,
        ...(dataController ? { dataController } : {}),
        ...(entryStampHelpImage ? { entryStampHelpImage } : {}),
      }
    : undefined;

  if (!roomMapEnabled) {
    guestStay = undefined;
    if (tourismRegistration) {
      guestStay = { tourismRegistration };
    }
    if (planStayStatusEnabled) {
      guestStay = { ...(guestStay ?? {}), planStayStatusEnabled: true };
    }
    return normalizeGuestStayComplianceOnRead(guestStay);
  }

  if (!guestStay) {
    guestStay = tourismRegistration ? { tourismRegistration } : undefined;
    if (planStayStatusEnabled) {
      guestStay = { ...(guestStay ?? {}), planStayStatusEnabled: true };
    }
    return normalizeGuestStayComplianceOnRead(guestStay);
  }

  const stripped = stripLegacyTourismFields(guestStay);
  let next = applyPlanStayStatusFlag(stripped, planStayStatusEnabled);

  if (tourismRegistration) {
    next = { ...next, tourismRegistration };
  }

  return normalizeGuestStayComplianceOnRead(next);
}
