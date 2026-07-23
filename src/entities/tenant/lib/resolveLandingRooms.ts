import type { LandingRoomType } from '../model/landing';
import type { TenantSettings } from '../model/settings';
import { readBookingSettings } from './resolveBookingConfig';
import {
  listStayOffers,
  mergeOfferIntoLandingRoomType,
  normalizeLandingRoomCards,
  normalizeStayOffersOnRead,
} from './normalizeStayOffers';

export interface ResolvedLandingRooms {
  sectionTitle?: string;
  sectionSubtitle?: string;
  roomTypes: LandingRoomType[];
}

function isCompleteLandingRoom(
  room: LandingRoomType,
  bookingEnabled: boolean
): LandingRoomType | null {
  const id = room.id?.trim();
  const title = room.title?.trim();
  const imageUrl = room.imageUrl?.trim();
  const engineRoomTypeId = room.engineRoomTypeId?.trim() || '';

  if (!id || !title || !imageUrl) {
    return null;
  }

  if (bookingEnabled && !engineRoomTypeId) {
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
  const normalized = normalizeStayOffersOnRead(settings);
  const landing = normalized.landing;
  const bookingEnabled = readBookingSettings(settings).provider !== 'none';
  const offers = listStayOffers(normalized);
  const cards = normalizeLandingRoomCards(landing?.roomCards);

  let roomTypes: LandingRoomType[] = [];

  if (cards.length > 0 && offers.length > 0) {
    const offerById = new Map(offers.map((offer) => [offer.id, offer]));
    roomTypes = cards
      .map((card) => {
        const offer = offerById.get(card.offerId);
        if (!offer) return null;
        return isCompleteLandingRoom(mergeOfferIntoLandingRoomType(offer, card), bookingEnabled);
      })
      .filter((room): room is LandingRoomType => room !== null);
  } else if (landing?.roomTypes?.length) {
    // Compat path if migrate did not run (empty titles etc.) — rare.
    roomTypes =
      landing.roomTypes
        .map((room) => isCompleteLandingRoom(room, bookingEnabled))
        .filter((room): room is LandingRoomType => room !== null) ?? [];
  }

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
