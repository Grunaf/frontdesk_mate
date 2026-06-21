import type { LandingRoomType, TenantLandingSettings } from '../model/landing';
import type { TenantSettings } from '../model/settings';

export interface ResolvedLandingRooms {
  sectionTitle?: string;
  sectionSubtitle?: string;
  roomTypes: LandingRoomType[];
}

function normalizeRoomType(room: LandingRoomType): LandingRoomType | null {
  const id = room.id?.trim();
  const engineRoomTypeId = room.engineRoomTypeId?.trim();
  const title = room.title?.trim();
  const imageUrl = room.imageUrl?.trim();

  if (!id || !engineRoomTypeId || !title || !imageUrl) {
    return null;
  }

  return {
    id,
    engineRoomTypeId,
    title,
    description: room.description?.trim() || '',
    priceFromEur: typeof room.priceFromEur === 'number' ? room.priceFromEur : undefined,
    imageUrl,
    requiresChatUpgrade: room.requiresChatUpgrade === true,
  };
}

export function resolveLandingRooms(settings: TenantSettings): ResolvedLandingRooms {
  const landing = settings.landing;
  const roomTypes =
    landing?.roomTypes
      ?.map(normalizeRoomType)
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
