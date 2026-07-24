import type { HousekeepingRoomStatus } from '@/entities/housekeeping';

export type GuestStayRoomInventory = {
  rooms?: Array<{ id: string }> | null;
  beds?: Array<{ roomId: string }> | null;
};

/** All physical room ids from guestStay (rooms[] + bed.roomId fallback). */
export function listHousekeepingInventoryRoomIds(
  guestStay: GuestStayRoomInventory | null | undefined
): string[] {
  const ids = new Set<string>();

  for (const room of guestStay?.rooms ?? []) {
    const id = room.id.trim();
    if (id && !id.startsWith('__')) ids.add(id);
  }

  for (const bed of guestStay?.beds ?? []) {
    const id = bed.roomId.trim();
    if (id && !id.startsWith('__')) ids.add(id);
  }

  return [...ids];
}

/** Apply Not cleaned only when unset or Cleaned — never no-op regress. */
export function shouldMarkRoomNotCleaned(
  current: HousekeepingRoomStatus | undefined
): boolean {
  return current === undefined || current === 'cleaned';
}

export function collectRoomIdsToMarkNotCleaned(
  guestStay: GuestStayRoomInventory | null | undefined,
  roomStatuses: Record<string, HousekeepingRoomStatus | undefined> = {}
): string[] {
  return listHousekeepingInventoryRoomIds(guestStay).filter((roomId) =>
    shouldMarkRoomNotCleaned(roomStatuses[roomId])
  );
}
