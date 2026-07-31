import type { GuestStayRecordWithLink } from '@/entities/guest-stay';

export const HUB_UNASSIGNED_ROOM_ID = '__unassigned__';

export type HubRoomRef = {
  roomId: string;
  roomLabel: string;
  /** Bookable bed ids in this room (inventory order). */
  bedIds: readonly string[];
};

export type HubRoomStayGroup = {
  roomId: string;
  roomLabel: string;
  stays: GuestStayRecordWithLink[];
};

/**
 * Project flat hub stays into inventory room groups.
 * Preserves relative stay order within each room. Empty rooms omitted.
 * Unknown beds → Unassigned at the end.
 */
export function groupHubStaysByRoom(input: {
  stays: readonly GuestStayRecordWithLink[];
  rooms: readonly HubRoomRef[];
}): HubRoomStayGroup[] {
  const roomIdByBedId = new Map<string, string>();
  const labelByRoomId = new Map<string, string>();

  for (const room of input.rooms) {
    labelByRoomId.set(room.roomId, room.roomLabel);
    for (const bedId of room.bedIds) {
      const id = bedId.trim();
      if (id) roomIdByBedId.set(id, room.roomId);
    }
  }

  const staysByRoom = new Map<string, GuestStayRecordWithLink[]>();
  for (const stay of input.stays) {
    const bedId = stay.bed_id?.trim() ?? '';
    const roomId = (bedId && roomIdByBedId.get(bedId)) || HUB_UNASSIGNED_ROOM_ID;
    const list = staysByRoom.get(roomId) ?? [];
    list.push(stay);
    staysByRoom.set(roomId, list);
  }

  const groups: HubRoomStayGroup[] = [];
  for (const room of input.rooms) {
    if (room.roomId === HUB_UNASSIGNED_ROOM_ID) continue;
    const stays = staysByRoom.get(room.roomId);
    if (!stays?.length) continue;
    groups.push({
      roomId: room.roomId,
      roomLabel: room.roomLabel,
      stays,
    });
  }

  const unassigned = staysByRoom.get(HUB_UNASSIGNED_ROOM_ID);
  if (unassigned?.length) {
    groups.push({
      roomId: HUB_UNASSIGNED_ROOM_ID,
      roomLabel: labelByRoomId.get(HUB_UNASSIGNED_ROOM_ID) ?? 'Unassigned',
      stays: unassigned,
    });
  }

  return groups;
}
