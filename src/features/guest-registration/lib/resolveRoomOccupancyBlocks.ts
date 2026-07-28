import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { guestStayCoversNight } from '@/entities/guest-stay/lib/guestAccessIntervals';
import type { TenantSettings } from '@/entities/tenant';
import { listStayOffers, resolveStayOfferBookingUnit } from '@/entities/tenant';
import { resolveBedUnitType } from '@/entities/room/model/bed-type';
import type { StayBed } from '@/entities/tenant/model/guestStay';
import { addNights } from './guestAccessDates';
import { isPlanCalendarOccupancyStay } from './resolvePlanStayCalendarPresentation';

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

/** Bookable bed ids configured in a physical room. */
export function listBookableBedIdsInRoom(
  settings: TenantSettings | undefined,
  roomId: string | undefined | null
): string[] {
  const id = roomId?.trim();
  if (!id || !settings?.guestStay) return [];
  const ids: string[] = [];
  for (const bed of settings.guestStay.beds ?? []) {
    if (bed.roomId !== id) continue;
    for (const bookableId of listBookableIdsForStayBed(bed)) {
      ids.push(bookableId);
    }
  }
  return ids;
}

/**
 * True when the physical room sells as a whole-room unit
 * (`StayOffer.bookingUnit === 'room'` via room.offerId).
 */
export function isWholeRoomUnitRoom(
  settings: TenantSettings | undefined,
  roomId: string | undefined | null
): boolean {
  const id = roomId?.trim();
  if (!id || !settings?.guestStay) return false;
  const room = (settings.guestStay.rooms ?? []).find((entry) => entry.id === id);
  const offerId = room?.offerId?.trim();
  if (!offerId) return false;
  const offer = listStayOffers(settings).find((entry) => entry.id === offerId);
  return resolveStayOfferBookingUnit(offer) === 'room';
}

/**
 * Room has occupancy that should hold remaining free beds for that night:
 * whole-room offer + at least one Plan-occupancy stay covering the night.
 * Empty private / bed-unit dorm → false (siblings stay walk-in free).
 */
export function roomHasWholeRoomOccupancyOnNight(input: {
  settings: TenantSettings | undefined;
  stays: GuestStayRecordWithLink[];
  roomId: string;
  nightDate: string;
}): boolean {
  if (!isWholeRoomUnitRoom(input.settings, input.roomId)) return false;

  const bedIds = new Set(listBookableBedIdsInRoom(input.settings, input.roomId));
  if (bedIds.size === 0) return false;

  return input.stays.some(
    (stay) =>
      isPlanCalendarOccupancyStay(stay) &&
      bedIds.has(stay.bed_id) &&
      guestStayCoversNight(stay, input.nightDate)
  );
}

/**
 * Bookable bed ids in a whole-room-occupied room that are not themselves occupied
 * that night — Plan must not treat these as walk-in free.
 */
export function listWholeRoomBlockedBedIdsForNight(input: {
  settings: TenantSettings | undefined;
  stays: GuestStayRecordWithLink[];
  nightDate: string;
}): Set<string> {
  const blocked = new Set<string>();
  const rooms = input.settings?.guestStay?.rooms ?? [];
  if (rooms.length === 0) return blocked;

  const occupancyStays = input.stays.filter(isPlanCalendarOccupancyStay);

  for (const room of rooms) {
    if (
      !roomHasWholeRoomOccupancyOnNight({
        settings: input.settings,
        stays: occupancyStays,
        roomId: room.id,
        nightDate: input.nightDate,
      })
    ) {
      continue;
    }

    const bedIds = listBookableBedIdsInRoom(input.settings, room.id);
    for (const bedId of bedIds) {
      const occupied = occupancyStays.some(
        (stay) => stay.bed_id === bedId && guestStayCoversNight(stay, input.nightDate)
      );
      if (!occupied) blocked.add(bedId);
    }
  }

  return blocked;
}

/**
 * Union of whole-room sibling blocks over half-open bed nights [checkInDate, checkOutDate).
 * Used by create-booking availability (overlappingBedIds).
 */
export function listWholeRoomBlockedBedIdsForDateRange(input: {
  settings: TenantSettings | undefined;
  stays: GuestStayRecordWithLink[];
  checkInDate: string;
  checkOutDate: string;
}): Set<string> {
  const blocked = new Set<string>();
  const start = input.checkInDate.slice(0, 10);
  const end = input.checkOutDate.slice(0, 10);
  if (!start || !end || end <= start) return blocked;

  for (let night = start; night < end; night = addNights(night, 1)) {
    for (const bedId of listWholeRoomBlockedBedIdsForNight({
      settings: input.settings,
      // New bookings must not treat checked-out history as live holds.
      stays: input.stays.filter((stay) => !stay.is_archived),
      nightDate: night,
    })) {
      blocked.add(bedId);
    }
  }

  return blocked;
}
