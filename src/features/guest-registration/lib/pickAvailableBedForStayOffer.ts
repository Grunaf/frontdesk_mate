import type { TenantSettings } from '@/entities/tenant';
import { listStayOffers, normalizeStayOffersOnRead } from '@/entities/tenant/lib/normalizeStayOffers';
import { resolveBedUnitType } from '@/entities/room/model/bed-type';
import type { StayBed } from '@/entities/tenant/model/guestStay';

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
  const pool = listBedIdsForStayOffer(input.settings, input.offerId);
  if (pool.length === 0) return null;
  const available = new Set(input.availableBedIds);
  return pool.find((bedId) => available.has(bedId)) ?? null;
}

/** First `count` free beds in offer order (for multi-guest auto-assign).
 * Room-unit offers prefer beds from a single physical room that can fit `count`.
 */
export function pickAvailableBedsForStayOffer(input: {
  settings: TenantSettings | undefined;
  offerId: string | undefined | null;
  availableBedIds: string[];
  count: number;
}): string[] {
  const n = Math.max(0, Math.floor(input.count));
  if (n === 0) return [];

  const pool = listBedIdsForStayOffer(input.settings, input.offerId);
  const available = new Set(input.availableBedIds);
  const offer = listStayOffers(normalizeStayOffersOnRead(input.settings ?? {})).find(
    (entry) => entry.id === input.offerId?.trim()
  );
  const isRoomUnit = offer?.bookingUnit === 'room';

  if (isRoomUnit && pool.length > 0 && input.settings?.guestStay) {
    const beds = input.settings.guestStay.beds ?? [];
    const roomOrder: string[] = [];
    const bedsByRoom = new Map<string, string[]>();

    for (const bedId of pool) {
      const bed = beds.find(
        (entry) =>
          entry.id === bedId || entry.topId === bedId || entry.bottomId === bedId
      );
      const roomId = bed?.roomId?.trim();
      if (!roomId) continue;
      if (!bedsByRoom.has(roomId)) {
        bedsByRoom.set(roomId, []);
        roomOrder.push(roomId);
      }
      bedsByRoom.get(roomId)!.push(bedId);
    }

    for (const roomId of roomOrder) {
      const freeInRoom = (bedsByRoom.get(roomId) ?? []).filter((bedId) => available.has(bedId));
      if (freeInRoom.length >= n) {
        return freeInRoom.slice(0, n);
      }
    }
  }

  const picked: string[] = [];

  if (pool.length > 0) {
    for (const bedId of pool) {
      if (!available.has(bedId)) continue;
      picked.push(bedId);
      if (picked.length >= n) return picked;
    }
  }

  // Fallback: any free inventory beds when offer pool is empty / short.
  for (const bedId of input.availableBedIds) {
    if (picked.includes(bedId)) continue;
    picked.push(bedId);
    if (picked.length >= n) break;
  }

  return picked;
}

export interface ReceptionStayOfferOption {
  id: string;
  title: string;
  availableBedCount: number;
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
      const pool = listBedIdsForStayOffer(normalized, offer.id);
      const availableBedCount = pool.filter((bedId) => available.has(bedId)).length;
      return {
        id: offer.id,
        title: offer.title,
        availableBedCount,
        configuredBedCount: pool.length,
      };
    })
    .filter((offer) => offer.configuredBedCount > 0)
    .map(({ id, title, availableBedCount }) => ({ id, title, availableBedCount }));
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
