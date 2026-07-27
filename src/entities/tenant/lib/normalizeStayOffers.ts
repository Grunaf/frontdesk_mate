import type { LandingRoomCard, LandingRoomType, TenantLandingSettings } from '../model/landing';
import type { StayOffer, StayOfferBookingUnit } from '../model/stayOffers';
import type { TenantSettings } from '../model/settings';

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeBasePriceEur(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function normalizeBookingUnit(value: unknown): StayOfferBookingUnit | undefined {
  return value === 'room' ? 'room' : value === 'bed' ? 'bed' : undefined;
}

function normalizeMaxGuests(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return undefined;
  return Math.min(99, Math.floor(value));
}

function bookingUnitFields(raw: Pick<StayOffer, 'bookingUnit' | 'maxGuests'>): {
  bookingUnit?: StayOfferBookingUnit;
  maxGuests?: number;
} {
  const bookingUnit = normalizeBookingUnit(raw.bookingUnit);
  if (bookingUnit !== 'room') {
    // Persist explicit `bed` only when set; omit default to keep JSON lean.
    return bookingUnit === 'bed' ? { bookingUnit: 'bed' } : {};
  }
  const maxGuests = normalizeMaxGuests(raw.maxGuests);
  return {
    bookingUnit: 'room',
    ...(maxGuests !== undefined ? { maxGuests } : {}),
  };
}

export function normalizeStayOffer(raw: StayOffer, index: number): StayOffer | null {
  const id = raw.id?.trim();
  const title = raw.title?.trim();
  if (!id || !title) return null;

  const engineRoomTypeId = trimOrUndefined(raw.engineRoomTypeId);
  const basePriceEur = normalizeBasePriceEur(raw.basePriceEur);
  const sortOrder = typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder)
    ? raw.sortOrder
    : index;

  return {
    id,
    title,
    ...(basePriceEur !== undefined ? { basePriceEur } : {}),
    ...bookingUnitFields(raw),
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
    .flatMap((offer, index): StayOffer[] => {
      const id = offer.id?.trim();
      if (!id) return [];
      const engineRoomTypeId = trimOrUndefined(offer.engineRoomTypeId);
      const basePriceEur = normalizeBasePriceEur(offer.basePriceEur);
      const sortOrder =
        typeof offer.sortOrder === 'number' && Number.isFinite(offer.sortOrder)
          ? offer.sortOrder
          : index;
      return [
        {
          id,
          title: typeof offer.title === 'string' ? offer.title : '',
          ...(basePriceEur !== undefined ? { basePriceEur } : {}),
          ...bookingUnitFields(offer),
          ...(engineRoomTypeId ? { engineRoomTypeId } : {}),
          sortOrder,
        },
      ];
    })
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
      const basePriceEur =
        normalizeBasePriceEur(card.priceFromEur) ??
        normalizeBasePriceEur(legacyRoom?.priceFromEur);
      return {
        id: card.offerId,
        title,
        ...(basePriceEur !== undefined ? { basePriceEur } : {}),
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
    const basePriceEur = normalizeBasePriceEur(room.priceFromEur);
    stayOffers.push({
      id,
      title,
      ...(basePriceEur !== undefined ? { basePriceEur } : {}),
      ...(engineRoomTypeId ? { engineRoomTypeId } : {}),
      sortOrder: index,
    });

    roomCards.push({
      offerId: id,
      title,
      description: room.description?.trim() || '',
      imageUrl: trimOrUndefined(room.imageUrl),
      requiresChatUpgrade: room.requiresChatUpgrade === true ? true : undefined,
    });
  });

  return { stayOffers, roomCards, didMigrate: stayOffers.length > 0 };
}

/** Prefer offer.basePriceEur; lift legacy card.priceFromEur onto offers missing a price. */
function liftCardPricesOntoOffers(
  offers: StayOffer[],
  cards: LandingRoomCard[]
): StayOffer[] {
  if (offers.length === 0 || cards.length === 0) return offers;
  const priceByOfferId = new Map<string, number>();
  for (const card of cards) {
    const price = normalizeBasePriceEur(card.priceFromEur);
    if (price === undefined) continue;
    if (!priceByOfferId.has(card.offerId)) {
      priceByOfferId.set(card.offerId, price);
    }
  }
  if (priceByOfferId.size === 0) return offers;

  return offers.map((offer) => {
    if (normalizeBasePriceEur(offer.basePriceEur) !== undefined) return offer;
    const lifted = priceByOfferId.get(offer.id);
    return lifted !== undefined ? { ...offer, basePriceEur: lifted } : offer;
  });
}

/** Strip legacy per-card price once offer owns basePriceEur (kept on LandingRoomType resolve only). */
function stripCardPrices(cards: LandingRoomCard[]): LandingRoomCard[] {
  return cards.map((card) => {
    if (card.priceFromEur === undefined) return card;
    const { priceFromEur: _removed, ...rest } = card;
    return rest;
  });
}

/**
 * Ensure settings expose stayOffers + roomCards (migrating legacy roomTypes in memory).
 * Does not strip roomTypes — callers that persist should use finalizeStayOffersForSave.
 */
export function normalizeStayOffersOnRead(settings: TenantSettings): TenantSettings {
  const { stayOffers, roomCards, didMigrate } = migrateLegacyLandingRoomTypes(settings);
  const liftedOffers = liftCardPricesOntoOffers(stayOffers, roomCards);

  if (!didMigrate && liftedOffers.length === 0 && roomCards.length === 0) {
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
    stayOffers: liftedOffers,
    landing: nextLanding,
  };
}

/** Persist shape: stayOffers + roomCards; drop legacy roomTypes and card prices. */
export function finalizeStayOffersForSave(settings: TenantSettings): TenantSettings {
  const normalized = normalizeStayOffersOnRead(settings);
  const stayOffers = normalizeStayOffers(normalized.stayOffers);
  const roomCards = stripCardPrices(
    normalizeLandingRoomCards(normalized.landing?.roomCards).filter((card) =>
      stayOffers.some((offer) => offer.id === card.offerId)
    )
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
  const priceFromEur =
    normalizeBasePriceEur(offer.basePriceEur) ??
    normalizeBasePriceEur(card?.priceFromEur);
  const unitFields = bookingUnitFields(offer);

  return {
    id: offer.id,
    engineRoomTypeId,
    title,
    description,
    priceFromEur,
    imageUrl,
    requiresChatUpgrade: card?.requiresChatUpgrade === true,
    ...(unitFields.bookingUnit ? { bookingUnit: unitFields.bookingUnit } : {}),
    ...(unitFields.maxGuests !== undefined ? { maxGuests: unitFields.maxGuests } : {}),
  };
}
