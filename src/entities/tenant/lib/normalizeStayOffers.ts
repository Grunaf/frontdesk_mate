import type { LandingRoomCard, LandingRoomType, TenantLandingSettings } from '../model/landing';
import type { StayOffer } from '../model/stayOffers';
import type { TenantSettings } from '../model/settings';

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function normalizeStayOffer(raw: StayOffer, index: number): StayOffer | null {
  const id = raw.id?.trim();
  const title = raw.title?.trim();
  if (!id || !title) return null;

  const engineRoomTypeId = trimOrUndefined(raw.engineRoomTypeId);
  const sortOrder = typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder)
    ? raw.sortOrder
    : index;

  return {
    id,
    title,
    ...(engineRoomTypeId ? { engineRoomTypeId } : {}),
    sortOrder,
  };
}

export function normalizeStayOffers(raw: StayOffer[] | undefined): StayOffer[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((offer, index) => normalizeStayOffer(offer, index))
    .filter((offer): offer is StayOffer => offer !== null)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * Admin draft editor: keep offers with an id even when title is still empty,
 * so "Add offer" rows remain visible until the user fills them in.
 * Strict dropping of incomplete offers stays in normalizeStayOffers / finalizeStayOffersForSave.
 */
export function coerceStayOffersForAdminEdit(raw: StayOffer[] | undefined): StayOffer[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((offer, index) => {
      const id = offer.id?.trim();
      if (!id) return null;
      const engineRoomTypeId = trimOrUndefined(offer.engineRoomTypeId);
      const sortOrder =
        typeof offer.sortOrder === 'number' && Number.isFinite(offer.sortOrder)
          ? offer.sortOrder
          : index;
      return {
        id,
        title: typeof offer.title === 'string' ? offer.title : '',
        ...(engineRoomTypeId ? { engineRoomTypeId } : {}),
        sortOrder,
      };
    })
    .filter((offer): offer is StayOffer => offer !== null)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Prefer raw stayOffers for admin; fall back to legacy migrate when unset. */
export function listStayOffersForAdmin(settings: TenantSettings): StayOffer[] {
  if (Array.isArray(settings.stayOffers)) {
    return coerceStayOffersForAdminEdit(settings.stayOffers);
  }
  return listStayOffers(normalizeStayOffersOnRead(settings));
}

export function normalizeLandingRoomCard(raw: LandingRoomCard): LandingRoomCard | null {
  const offerId = raw.offerId?.trim();
  if (!offerId) return null;

  return {
    offerId,
    title: trimOrUndefined(raw.title),
    description: trimOrUndefined(raw.description) ?? '',
    priceFromEur: typeof raw.priceFromEur === 'number' ? raw.priceFromEur : undefined,
    imageUrl: trimOrUndefined(raw.imageUrl),
    requiresChatUpgrade: raw.requiresChatUpgrade === true ? true : undefined,
  };
}

export function normalizeLandingRoomCards(raw: LandingRoomCard[] | undefined): LandingRoomCard[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((card) => normalizeLandingRoomCard(card))
    .filter((card): card is LandingRoomCard => card !== null);
}

/** Migrate legacy landing.roomTypes → stayOffers + landing.roomCards when needed. */
export function migrateLegacyLandingRoomTypes(settings: TenantSettings): {
  stayOffers: StayOffer[];
  roomCards: LandingRoomCard[];
  didMigrate: boolean;
} {
  const existingOffers = normalizeStayOffers(settings.stayOffers);
  const existingCards = normalizeLandingRoomCards(settings.landing?.roomCards);
  const legacy = Array.isArray(settings.landing?.roomTypes) ? settings.landing.roomTypes : [];

  if (existingOffers.length > 0) {
    return {
      stayOffers: existingOffers,
      roomCards: existingCards,
      didMigrate: false,
    };
  }

  if (existingCards.length > 0) {
    const legacyById = new Map(
      legacy
        .filter((room) => room.id?.trim())
        .map((room) => [room.id.trim(), room] as const)
    );
    const stayOffers: StayOffer[] = existingCards.map((card, index) => {
      const legacyRoom = legacyById.get(card.offerId);
      const title =
        card.title?.trim() || legacyRoom?.title?.trim() || card.offerId;
      const engineRoomTypeId = trimOrUndefined(legacyRoom?.engineRoomTypeId);
      return {
        id: card.offerId,
        title,
        ...(engineRoomTypeId ? { engineRoomTypeId } : {}),
        sortOrder: index,
      };
    });
    return { stayOffers, roomCards: existingCards, didMigrate: true };
  }

  if (legacy.length === 0) {
    return { stayOffers: [], roomCards: [], didMigrate: false };
  }

  const stayOffers: StayOffer[] = [];
  const roomCards: LandingRoomCard[] = [];

  legacy.forEach((room, index) => {
    const id = room.id?.trim();
    const title = room.title?.trim();
    if (!id || !title) return;

    const engineRoomTypeId = trimOrUndefined(room.engineRoomTypeId);
    stayOffers.push({
      id,
      title,
      ...(engineRoomTypeId ? { engineRoomTypeId } : {}),
      sortOrder: index,
    });

    roomCards.push({
      offerId: id,
      title,
      description: room.description?.trim() || '',
      priceFromEur: typeof room.priceFromEur === 'number' ? room.priceFromEur : undefined,
      imageUrl: trimOrUndefined(room.imageUrl),
      requiresChatUpgrade: room.requiresChatUpgrade === true ? true : undefined,
    });
  });

  return { stayOffers, roomCards, didMigrate: stayOffers.length > 0 };
}

/**
 * Ensure settings expose stayOffers + roomCards (migrating legacy roomTypes in memory).
 * Does not strip roomTypes — callers that persist should use finalizeStayOffersForSave.
 */
export function normalizeStayOffersOnRead(settings: TenantSettings): TenantSettings {
  const { stayOffers, roomCards, didMigrate } = migrateLegacyLandingRoomTypes(settings);

  if (!didMigrate && stayOffers.length === 0 && roomCards.length === 0) {
    if (!settings.stayOffers?.length && !settings.landing?.roomCards?.length) {
      return settings;
    }
  }

  const nextLanding: TenantLandingSettings = {
    ...settings.landing,
    roomCards,
  };

  return {
    ...settings,
    stayOffers,
    landing: nextLanding,
  };
}

/** Persist shape: stayOffers + roomCards; drop legacy roomTypes. */
export function finalizeStayOffersForSave(settings: TenantSettings): TenantSettings {
  const normalized = normalizeStayOffersOnRead(settings);
  const stayOffers = normalizeStayOffers(normalized.stayOffers);
  const roomCards = normalizeLandingRoomCards(normalized.landing?.roomCards).filter((card) =>
    stayOffers.some((offer) => offer.id === card.offerId)
  );

  const { roomTypes: _legacy, ...landingRest } = normalized.landing ?? {};

  return {
    ...normalized,
    stayOffers: stayOffers.length > 0 ? stayOffers : undefined,
    landing: {
      ...landingRest,
      roomCards: roomCards.length > 0 ? roomCards : undefined,
    },
  };
}

export function listStayOffers(settings: TenantSettings): StayOffer[] {
  return normalizeStayOffersOnRead(settings).stayOffers ?? [];
}

export function resolveStayOfferById(
  settings: TenantSettings,
  offerId: string | undefined | null
): StayOffer | null {
  const id = offerId?.trim();
  if (!id) return null;
  return listStayOffers(settings).find((offer) => offer.id === id) ?? null;
}

/** Merge offer + card overrides into the public LandingRoomType shape. */
export function mergeOfferIntoLandingRoomType(
  offer: StayOffer,
  card: LandingRoomCard | undefined
): LandingRoomType {
  const title = card?.title?.trim() || offer.title;
  const description = card?.description?.trim() || '';
  const imageUrl = card?.imageUrl?.trim() || '';
  const engineRoomTypeId = offer.engineRoomTypeId?.trim() || '';

  return {
    id: offer.id,
    engineRoomTypeId,
    title,
    description,
    priceFromEur: typeof card?.priceFromEur === 'number' ? card.priceFromEur : undefined,
    imageUrl,
    requiresChatUpgrade: card?.requiresChatUpgrade === true,
  };
}
