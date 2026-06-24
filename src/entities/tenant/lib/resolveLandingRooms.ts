import type { LandingRoomType, TenantLandingSettings } from '../model/landing';
import type { TenantSettings } from '../model/settings';
import { readBookingSettings } from './resolveBookingConfig';

export interface ResolvedLandingRooms {
  sectionTitle?: string;
  sectionSubtitle?: string;
  roomTypes: LandingRoomType[];
}

function normalizeRoomType(
  room: LandingRoomType,
  bookingEnabled: boolean
): LandingRoomType | null {
  const id = room.id?.trim();
  const engineRoomTypeId = room.engineRoomTypeId?.trim();
  const title = room.title?.trim();
  const imageUrl = room.imageUrl?.trim();

  if (!id || !title || !imageUrl) {
    return null;
  }

  if (bookingEnabled && !engineRoomTypeId) {
    return null;
  }

  return {
    id,
    engineRoomTypeId: engineRoomTypeId || '',
    title,
    description: room.description?.trim() || '',
    priceFromEur: typeof room.priceFromEur === 'number' ? room.priceFromEur : undefined,
    imageUrl,
    requiresChatUpgrade: room.requiresChatUpgrade === true,
  };
}

export function resolveLandingRooms(settings: TenantSettings): ResolvedLandingRooms {
  const landing = settings.landing;
  const bookingEnabled = readBookingSettings(settings).provider !== 'none';
  const roomTypes =
    landing?.roomTypes
      ?.map((room) => normalizeRoomType(room, bookingEnabled))
      .filter((room): room is LandingRoomType => room !== null) ?? [];

  return {
    sectionTitle: landing?.roomsSectionTitle?.trim() || undefined,
    sectionSubtitle: landing?.roomsSectionSubtitle?.trim() || undefined,
    roomTypes,
  };
}

export function hasLandingRooms(settings: TenantSettings): boolean {
  return resolveLandingRooms(settings).roomTypes.length > 0;
}

export function hasLandingContent(settings: TenantSettings): boolean {
  return Boolean(settings.heroBgUrl?.trim()) || hasLandingRooms(settings);
}
