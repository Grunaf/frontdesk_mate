import type { TenantSettings } from '@/entities/tenant';
import { listStayOffers, normalizeStayOffersOnRead } from '@/entities/tenant/lib/normalizeStayOffers';
import type { StayOfferBookingUnit } from '@/entities/tenant/model/stayOffers';
import { resolveStayOfferBookingUnit } from '@/entities/tenant/model/stayOffers';
import { listBookableBedIdsInRoom } from './resolveRoomOccupancyBlocks';

export type ReceptionRoomFreeBeds = {
  roomId: string;
  offerId: string;
  freeBedIds: string[];
  /** True when every configured bed in the room is free. */
  isEmpty: boolean;
};

/** Free beds grouped by physical room for rooms linked to the offer. */
export function listOfferRoomFreeBeds(input: {
  settings: TenantSettings | undefined;
  offerId: string | undefined | null;
  availableBedIds: string[];
}): ReceptionRoomFreeBeds[] {
  const offerId = input.offerId?.trim();
  if (!offerId || !input.settings?.guestStay) return [];

  const available = new Set(input.availableBedIds);
  const roomIds = (input.settings.guestStay.rooms ?? [])
    .filter((room) => room.offerId?.trim() === offerId)
    .map((room) => room.id);

  const result: ReceptionRoomFreeBeds[] = [];
  for (const roomId of roomIds) {
    const configured = listBookableBedIdsInRoom(input.settings, roomId);
    if (configured.length === 0) continue;
    const freeBedIds = configured.filter((bedId) => available.has(bedId));
    result.push({
      roomId,
      offerId,
      freeBedIds,
      isEmpty: freeBedIds.length === configured.length,
    });
  }
  return result;
}

function listBedIdsForOffer(
  settings: TenantSettings | undefined,
  offerId: string
): string[] {
  const ids: string[] = [];
  if (!settings?.guestStay) return ids;
  for (const room of settings.guestStay.rooms ?? []) {
    if (room.offerId?.trim() !== offerId) continue;
    for (const bedId of listBookableBedIdsInRoom(settings, room.id)) {
      ids.push(bedId);
    }
  }
  return ids;
}

/** Max beds in one fully empty room across all room-unit StayOffers. */
export function maxEmptyRoomUnitCapacity(input: {
  settings: TenantSettings | undefined;
  availableBedIds: string[];
}): number {
  const normalized = normalizeStayOffersOnRead(input.settings ?? {});
  let max = 0;
  for (const offer of listStayOffers(normalized)) {
    if (resolveStayOfferBookingUnit(offer) !== 'room') continue;
    for (const room of listOfferRoomFreeBeds({
      settings: normalized,
      offerId: offer.id,
      availableBedIds: input.availableBedIds,
    })) {
      if (!room.isEmpty) continue;
      max = Math.max(max, room.freeBedIds.length);
    }
  }
  return max;
}

/** Max beds in one empty room for a specific room-unit offer. */
export function maxEmptyRoomCapacityForOffer(input: {
  settings: TenantSettings | undefined;
  offerId: string | undefined | null;
  availableBedIds: string[];
}): number {
  let max = 0;
  for (const room of listOfferRoomFreeBeds(input)) {
    if (!room.isEmpty) continue;
    max = Math.max(max, room.freeBedIds.length);
  }
  return max;
}

export function countDormFreeBeds(input: {
  settings: TenantSettings | undefined;
  availableBedIds: string[];
}): number {
  const normalized = normalizeStayOffersOnRead(input.settings ?? {});
  const available = new Set(input.availableBedIds);
  const counted = new Set<string>();

  for (const offer of listStayOffers(normalized)) {
    if (resolveStayOfferBookingUnit(offer) !== 'bed') continue;
    for (const bedId of listBedIdsForOffer(normalized, offer.id)) {
      if (available.has(bedId)) counted.add(bedId);
    }
  }

  return counted.size;
}

/**
 * Guests dropdown max — global inventory for the dates only.
 * Independent of the selected Stay offer (offer is placement, not can-we).
 */
export function resolveGlobalPartyCapacity(input: {
  settings: TenantSettings | undefined;
  availableBedIds: string[];
}): number {
  const dormFree = countDormFreeBeds(input);
  const privateEmpty = maxEmptyRoomUnitCapacity(input);
  return Math.max(dormFree, privateEmpty);
}

/** @deprecated Use resolveGlobalPartyCapacity — offer must not drive Guests max. */
export function resolvePartyGuestCapacity(input: {
  settings: TenantSettings | undefined;
  offerId: string | undefined | null;
  availableBedIds: string[];
  bookingUnit: StayOfferBookingUnit;
}): number {
  void input.offerId;
  void input.bookingUnit;
  return resolveGlobalPartyCapacity({
    settings: input.settings,
    availableBedIds: input.availableBedIds,
  });
}

/** First room-unit offer that has an empty room with at least `guestCount` beds. */
export function findPrivateRoomOfferForParty(input: {
  settings: TenantSettings | undefined;
  availableBedIds: string[];
  guestCount: number;
}): string | null {
  const n = Math.max(1, Math.floor(input.guestCount));
  const normalized = normalizeStayOffersOnRead(input.settings ?? {});
  for (const offer of listStayOffers(normalized)) {
    if (resolveStayOfferBookingUnit(offer) !== 'room') continue;
    const capacity = maxEmptyRoomCapacityForOffer({
      settings: normalized,
      offerId: offer.id,
      availableBedIds: input.availableBedIds,
    });
    if (capacity >= n) return offer.id;
  }
  return null;
}

function sortRoomsByFreeDesc(rooms: ReceptionRoomFreeBeds[]): ReceptionRoomFreeBeds[] {
  return [...rooms].sort((a, b) => b.freeBedIds.length - a.freeBedIds.length);
}

/**
 * Prefer one room with the most free beds that fits `count`.
 * Else split across rooms (largest free first).
 * `preferredOfferId` rooms are tried before other offers of the same unit kind.
 */
export function pickBedsSameRoomFirst(input: {
  settings: TenantSettings | undefined;
  preferredOfferId: string | undefined | null;
  availableBedIds: string[];
  count: number;
  /** When true, only fully empty rooms (room-unit sell). */
  emptyRoomsOnly?: boolean;
  /** Limit to preferred offer only. */
  offerIdOnly?: boolean;
}): string[] {
  const n = Math.max(0, Math.floor(input.count));
  if (n === 0) return [];

  const normalized = normalizeStayOffersOnRead(input.settings ?? {});
  const preferred = input.preferredOfferId?.trim() || '';
  const unitFilter: StayOfferBookingUnit = input.emptyRoomsOnly ? 'room' : 'bed';

  const offers = listStayOffers(normalized).filter(
    (offer) => resolveStayOfferBookingUnit(offer) === unitFilter
  );

  const offerOrder: string[] = [];
  if (preferred) offerOrder.push(preferred);
  if (!input.offerIdOnly) {
    for (const offer of offers) {
      if (offer.id !== preferred) offerOrder.push(offer.id);
    }
  } else if (preferred && !offerOrder.includes(preferred)) {
    offerOrder.push(preferred);
  }

  const rooms: ReceptionRoomFreeBeds[] = [];
  for (const offerId of offerOrder) {
    for (const room of listOfferRoomFreeBeds({
      settings: normalized,
      offerId,
      availableBedIds: input.availableBedIds,
    })) {
      if (input.emptyRoomsOnly && !room.isEmpty) continue;
      if (room.freeBedIds.length === 0) continue;
      rooms.push(room);
    }
  }

  const ranked = sortRoomsByFreeDesc(rooms);
  const fit = ranked.find((room) => room.freeBedIds.length >= n);
  if (fit) return fit.freeBedIds.slice(0, n);

  const picked: string[] = [];
  for (const room of ranked) {
    for (const bedId of room.freeBedIds) {
      if (picked.includes(bedId)) continue;
      picked.push(bedId);
      if (picked.length >= n) return picked;
    }
  }
  return picked;
}
