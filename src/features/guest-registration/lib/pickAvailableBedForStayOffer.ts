import type { TenantSettings } from '@/entities/tenant';
import { listStayOffers, normalizeStayOffersOnRead } from '@/entities/tenant/lib/normalizeStayOffers';
import { resolveBedUnitType } from '@/entities/room/model/bed-type';
import type { StayBed } from '@/entities/tenant/model/guestStay';
import {
  resolveStayOfferBookingUnit,
  type StayOfferBookingUnit,
} from '@/entities/tenant/model/stayOffers';
import { pickBedsSameRoomFirst, countDormFreeBeds } from './resolveReceptionPartyPlacement';

function listBookableIdsForStayBed(bed: StayBed): string[] {
  if (resolveBedUnitType(bed) === 'bunk') {
    const ids: string[] = [];
    if (bed.topId?.trim()) ids.push(bed.topId.trim());
    if (bed.bottomId?.trim()) ids.push(bed.bottomId.trim());
    return ids;
  }
  if (bed.id?.trim()) return [bed.id.trim()];
  return [];
}

/** Bookable bed ids belonging to rooms linked to the offer. */
export function listBedIdsForStayOffer(
  settings: TenantSettings | undefined,
  offerId: string | undefined | null
): string[] {
  const id = offerId?.trim();
  if (!id || !settings?.guestStay) return [];

  const roomIds = new Set(
    (settings.guestStay.rooms ?? [])
      .filter((room) => room.offerId?.trim() === id)
      .map((room) => room.id)
  );
  if (roomIds.size === 0) return [];

  const ids: string[] = [];
  for (const bed of settings.guestStay.beds ?? []) {
    if (!roomIds.has(bed.roomId)) continue;
    for (const bookableId of listBookableIdsForStayBed(bed)) {
      ids.push(bookableId);
    }
  }
  return ids;
}

export function pickAvailableBedForStayOffer(input: {
  settings: TenantSettings | undefined;
  offerId: string | undefined | null;
  availableBedIds: string[];
}): string | null {
  const picked = pickAvailableBedsForStayOffer({ ...input, count: 1 });
  return picked[0] ?? null;
}

/**
 * Auto-assign `count` beds.
 * Bed-unit: same room with most free first (preferred offer, then other dorms); else split.
 * Room-unit: only fully empty rooms on that offer; whole-room fit preferred.
 */
export function pickAvailableBedsForStayOffer(input: {
  settings: TenantSettings | undefined;
  offerId: string | undefined | null;
  availableBedIds: string[];
  count: number;
}): string[] {
  const n = Math.max(0, Math.floor(input.count));
  if (n === 0) return [];

  const normalized = normalizeStayOffersOnRead(input.settings ?? {});
  const offer = listStayOffers(normalized).find((entry) => entry.id === input.offerId?.trim());
  const bookingUnit = resolveStayOfferBookingUnit(offer);

  if (bookingUnit === 'room') {
    return pickBedsSameRoomFirst({
      settings: normalized,
      preferredOfferId: input.offerId,
      availableBedIds: input.availableBedIds,
      count: n,
      emptyRoomsOnly: true,
      offerIdOnly: true,
    });
  }

  return pickBedsSameRoomFirst({
    settings: normalized,
    preferredOfferId: input.offerId,
    availableBedIds: input.availableBedIds,
    count: n,
    emptyRoomsOnly: false,
    offerIdOnly: false,
  });
}

export interface ReceptionStayOfferOption {
  id: string;
  title: string;
  availableBedCount: number;
  bookingUnit: StayOfferBookingUnit;
}

/**
 * Free bookable beds across all StayOffers with bookingUnit `bed` (dorms).
 * Room-unit offers are excluded.
 */
export function countAvailableBedUnitBeds(input: {
  settings: TenantSettings | undefined;
  availableBedIds: string[];
}): number {
  return countDormFreeBeds(input);
}

/** Offers that have at least one configured bed in linked rooms (availability counted separately). */
export function listReceptionStayOfferOptions(input: {
  settings: TenantSettings | undefined;
  availableBedIds: string[];
}): ReceptionStayOfferOption[] {
  const normalized = normalizeStayOffersOnRead(input.settings ?? {});
  const offers = listStayOffers(normalized);
  const available = new Set(input.availableBedIds);

  return offers
    .map((offer) => {
      const bookingUnit = resolveStayOfferBookingUnit(offer);
      const pool = listBedIdsForStayOffer(normalized, offer.id);
      let availableBedCount = 0;
      if (bookingUnit === 'room') {
        const roomIds = new Set(
          (normalized.guestStay?.rooms ?? [])
            .filter((room) => room.offerId?.trim() === offer.id)
            .map((room) => room.id)
        );
        const byRoom = new Map<string, { configured: string[]; free: string[] }>();
        for (const bed of normalized.guestStay?.beds ?? []) {
          if (!roomIds.has(bed.roomId)) continue;
          const ids = listBookableIdsForStayBed(bed);
          const entry = byRoom.get(bed.roomId) ?? { configured: [], free: [] };
          for (const id of ids) {
            entry.configured.push(id);
            if (available.has(id)) entry.free.push(id);
          }
          byRoom.set(bed.roomId, entry);
        }
        for (const entry of byRoom.values()) {
          if (entry.free.length === entry.configured.length && entry.configured.length > 0) {
            availableBedCount += entry.free.length;
          }
        }
      } else {
        availableBedCount = pool.filter((bedId) => available.has(bedId)).length;
      }
      return {
        id: offer.id,
        title: offer.title,
        availableBedCount,
        bookingUnit,
        configuredBedCount: pool.length,
      };
    })
    .filter((offer) => offer.configuredBedCount > 0)
    .map(({ id, title, availableBedCount, bookingUnit }) => ({
      id,
      title,
      availableBedCount,
      bookingUnit,
    }));
}

export function resolveOfferIdForBed(
  settings: TenantSettings | undefined,
  bedId: string | undefined | null
): string | null {
  const id = bedId?.trim();
  if (!id || !settings?.guestStay) return null;

  const bed = (settings.guestStay.beds ?? []).find(
    (entry) => entry.id === id || entry.topId === id || entry.bottomId === id
  );
  if (!bed?.roomId) return null;
  const room = (settings.guestStay.rooms ?? []).find((entry) => entry.id === bed.roomId);
  return room?.offerId?.trim() || null;
}
