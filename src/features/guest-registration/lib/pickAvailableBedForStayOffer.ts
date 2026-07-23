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
