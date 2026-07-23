import { listGuestStayBedIds } from '@/entities/guest-stay';
import {
  resolveBedDisplayLabel,
} from '@/entities/tenant/lib/resolveBedDisplay';
import type { TenantSettings } from '@/entities/tenant';
import { guestAccessBedNightsOverlap } from '@/entities/guest-stay/lib/guestAccessIntervals';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { BedRoomOptionGroup } from '@/shared/ui';

const UNASSIGNED_ROOM_ID = '__unassigned__';

/** Flat bed list (ids) for overlap checks. */
export function listVolunteerBedIds(settings: TenantSettings): string[] {
  return listGuestStayBedIds(settings);
}

/**
 * Reception-shaped bed groups: room optgroup + slot displayLabel inside.
 * Same structure as IssueGuestAccessForm `bedsByRoom`.
 */
export function listVolunteerBedsByRoom(settings: TenantSettings): BedRoomOptionGroup[] {
  const guestStay = settings.guestStay;
  const rooms = guestStay?.rooms ?? [];
  const beds = guestStay?.beds ?? [];
  const bedIds = listGuestStayBedIds(settings);

  const roomOrder = new Map(rooms.map((room, index) => [room.id, index]));
  const groups = new Map<string, BedRoomOptionGroup>();

  for (const bedId of bedIds) {
    const parent = beds.find(
      (bed) => bed.id === bedId || bed.topId === bedId || bed.bottomId === bedId
    );
    const roomId = parent?.roomId?.trim() || UNASSIGNED_ROOM_ID;
    const room = rooms.find((entry) => entry.id === roomId);
    const roomLabel = room?.label?.trim() || (roomId === UNASSIGNED_ROOM_ID ? 'Unassigned' : roomId);

    let group = groups.get(roomId);
    if (!group) {
      group = { roomId, roomLabel, beds: [] };
      groups.set(roomId, group);
    }

    group.beds.push({
      bedId,
      displayLabel: resolveBedDisplayLabel(settings, bedId) ?? bedId,
    });
  }

  return [...groups.values()].sort((a, b) => {
    const aOrder = roomOrder.get(a.roomId) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = roomOrder.get(b.roomId) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.roomLabel.localeCompare(b.roomLabel);
  });
}

/** Map bedId → "Room · slot" for list rows. */
export function buildVolunteerBedLabelById(bedsByRoom: BedRoomOptionGroup[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const group of bedsByRoom) {
    for (const bed of group.beds) {
      labels[bed.bedId] = `${group.roomLabel} · ${bed.displayLabel}`;
    }
  }
  return labels;
}

export function filterBedsByRoomAvailable(
  bedsByRoom: BedRoomOptionGroup[],
  unavailableBedIds: Set<string>
): BedRoomOptionGroup[] {
  return bedsByRoom
    .map((group) => ({
      ...group,
      beds: group.beds.filter((bed) => !unavailableBedIds.has(bed.bedId)),
    }))
    .filter((group) => group.beds.length > 0);
}

export function listUnavailableVolunteerBedIds(input: {
  planStays: Pick<
    GuestStayRecordWithLink,
    'bed_id' | 'check_in_date' | 'check_out_date' | 'is_archived' | 'revoked_at'
  >[];
  bedIds: string[];
  checkInDate: string;
  checkOutDate: string;
}): Set<string> {
  const unavailable = new Set<string>();
  for (const bedId of input.bedIds) {
    const overlaps = input.planStays.some((stay) => {
      if (stay.is_archived || stay.revoked_at) return false;
      if (stay.bed_id !== bedId) return false;
      return guestAccessBedNightsOverlap(
        stay.check_in_date,
        stay.check_out_date,
        input.checkInDate,
        input.checkOutDate
      );
    });
    if (overlaps) unavailable.add(bedId);
  }
  return unavailable;
}
