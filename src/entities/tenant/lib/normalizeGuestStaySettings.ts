import type { GuestStayConfig } from '../model/guestStay';
import type { TenantSettings } from '../model/settings';

export function resolveTourismRegistrationRequired(
  settings: TenantSettings | undefined
): boolean {
  return settings?.guestStay?.tourismRegistrationRequired === true;
}

function guestStayHasRoomMapData(guestStay: GuestStayConfig): boolean {
  return (
    (guestStay.floors?.length ?? 0) > 0 ||
    (guestStay.rooms?.length ?? 0) > 0 ||
    (guestStay.beds?.length ?? 0) > 0
  );
}

export function normalizeGuestStayComplianceOnRead(
  guestStay: GuestStayConfig | undefined
): GuestStayConfig | undefined {
  if (!guestStay) {
    return undefined;
  }

  const tourismRegistrationRequired =
    guestStay.tourismRegistrationRequired === true ? true : undefined;

  if (!guestStayHasRoomMapData(guestStay) && !tourismRegistrationRequired) {
    return undefined;
  }

  if (!tourismRegistrationRequired) {
    const { tourismRegistrationRequired: _omit, ...rest } = guestStay;
    return guestStayHasRoomMapData(rest) ? rest : undefined;
  }

  return { ...guestStay, tourismRegistrationRequired: true };
}

export function finalizeGuestStayForSave(input: {
  roomMapEnabled: boolean;
  guestStay: GuestStayConfig | undefined;
  tourismRegistrationRequired: boolean;
}): TenantSettings['guestStay'] {
  const { roomMapEnabled, tourismRegistrationRequired } = input;
  let guestStay = input.guestStay;

  if (!roomMapEnabled) {
    guestStay = tourismRegistrationRequired ? { tourismRegistrationRequired: true } : undefined;
    return normalizeGuestStayComplianceOnRead(guestStay);
  }

  if (!guestStay) {
    return tourismRegistrationRequired ? { tourismRegistrationRequired: true } : undefined;
  }

  if (tourismRegistrationRequired) {
    guestStay = { ...guestStay, tourismRegistrationRequired: true };
  } else {
    const { tourismRegistrationRequired: _omit, ...rest } = guestStay;
    guestStay = rest;
  }

  return normalizeGuestStayComplianceOnRead(guestStay);
}
