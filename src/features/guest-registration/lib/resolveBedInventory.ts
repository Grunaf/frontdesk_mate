import { resolveBedUnitType } from '@/entities/room/model/bed-type';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  guestAccessCoversNight,
  resolveNightCellStatus,
  type BedNightCellStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { GuestStayConfig, StayBed } from '@/entities/tenant/model/guestStay';
import type { TenantSettings } from '@/entities/tenant';
import { resolveBedDisplayLabel } from '@/entities/tenant/lib/resolveBedDisplay';
import { todayUtcDate } from './guestAccessDates';

export type BedInventoryStatus = 'free' | 'occupied';

const UNASSIGNED_ROOM_ID = '__unassigned__';

export interface BedInventoryEntry {
  bedId: string;
  displayLabel: string;
  status: BedInventoryStatus;
  stay?: GuestStayRecordWithLink;
  nextAccess?: GuestStayRecordWithLink;
  nightCellStatus?: BedNightCellStatus;
}

export interface BedInventoryRoomGroup {
  roomId: string;
  roomLabel: string;
  beds: BedInventoryEntry[];
}

export interface BedInventorySnapshot {
  roomGroups: BedInventoryRoomGroup[];
  orphanStays: GuestStayRecordWithLink[];
}

export interface ResolveBedInventoryOptions {
  nightDate: string;
  now?: Date;
}

function findStayBedForGuestId(configBeds: StayBed[], bedId: string): StayBed | null {
  return (
    configBeds.find(
      (bed) => bed.id === bedId || bed.topId === bedId || bed.bottomId === bedId
    ) ?? null
  );
}

function resolveRoomIdForBedId(configBeds: StayBed[], bedId: string): string {
  const parent = findStayBedForGuestId(configBeds, bedId);
  return parent?.roomId?.trim() || UNASSIGNED_ROOM_ID;
}

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

function isInternalBunkUnitId(bed: StayBed, bedId: string): boolean {
  if (resolveBedUnitType(bed) !== 'bunk') return false;
  return bed.id === bedId && Boolean(bed.topId?.trim() || bed.bottomId?.trim());
}

function resolveRoomLabel(guestStay: GuestStayConfig | undefined, roomId: string): string {
  if (roomId === UNASSIGNED_ROOM_ID) return 'Unassigned';

  const room = guestStay?.rooms?.find((entry) => entry.id === roomId);
  return room?.label?.trim() || roomId;
}

function normalizeResolveOptions(
  options: ResolveBedInventoryOptions | Date = new Date()
): { nightDate: string; now: Date } {
  if (options instanceof Date) {
    const now = options;
    return { nightDate: todayUtcDate(now), now };
  }

  const now = options.now ?? new Date();
  return { nightDate: options.nightDate, now };
}

function resolveStaysForBedOnNight(
  bedId: string,
  activeStays: GuestStayRecordWithLink[],
  nightDate: string,
  now: Date
): {
  current?: GuestStayRecordWithLink;
  next?: GuestStayRecordWithLink;
  nightCellStatus?: BedNightCellStatus;
} {
  const bedStays = activeStays
    .filter((stay) => stay.bed_id === bedId)
    .sort((a, b) => new Date(a.check_in_at).getTime() - new Date(b.check_in_at).getTime());

  const current = bedStays.find((stay) => guestAccessCoversNight(stay, nightDate));
  const next = current
    ? undefined
    : bedStays.find(
        (stay) =>
          !guestAccessCoversNight(stay, nightDate) && stay.check_in_at.slice(0, 10) > nightDate
      );

  const nightCellStatus = current
    ? (resolveNightCellStatus(current, nightDate, now) ?? 'occupied')
    : undefined;

  return { current, next, nightCellStatus };
}

function buildEntry(
  settings: TenantSettings,
  bedId: string,
  activeStays: GuestStayRecordWithLink[],
  nightDate: string,
  now: Date
): BedInventoryEntry {
  const { current, next, nightCellStatus } = resolveStaysForBedOnNight(
    bedId,
    activeStays,
    nightDate,
    now
  );
  return {
    bedId,
    displayLabel: resolveBedDisplayLabel(settings, bedId) ?? bedId,
    status: current ? 'occupied' : 'free',
    stay: current,
    nextAccess: next,
    nightCellStatus,
  };
}

function appendUniqueRoomId(order: string[], roomId: string): void {
  if (!order.includes(roomId)) {
    order.push(roomId);
  }
}

export function resolveBedInventory(
  settings: TenantSettings,
  stays: GuestStayRecordWithLink[],
  options: ResolveBedInventoryOptions | Date = new Date()
): BedInventorySnapshot {
  const { nightDate, now } = normalizeResolveOptions(options);
  const guestStay = settings.guestStay;
  const configBeds = guestStay?.beds ?? [];
  const activeStays = stays.filter((stay) => !stay.revoked_at);
  const configuredBedIds = new Set(listGuestStayBedIds(settings));
  const entriesByRoom = new Map<string, BedInventoryEntry[]>();
  const processedIds = new Set<string>();

  const ensureRoom = (roomId: string) => {
    if (!entriesByRoom.has(roomId)) {
      entriesByRoom.set(roomId, []);
    }
  };

  const pushEntry = (roomId: string, bedId: string) => {
    if (processedIds.has(bedId)) return;
    processedIds.add(bedId);
    ensureRoom(roomId);
    entriesByRoom.get(roomId)!.push(buildEntry(settings, bedId, activeStays, nightDate, now));
  };

  const roomOrder: string[] = [];
  for (const room of guestStay?.rooms ?? []) {
    appendUniqueRoomId(roomOrder, room.id);
    for (const bed of configBeds.filter((entry) => entry.roomId === room.id)) {
      for (const bedId of listBookableIdsForStayBed(bed)) {
        pushEntry(room.id, bedId);
      }
    }
  }

  for (const bed of configBeds) {
    const roomId = bed.roomId?.trim() || UNASSIGNED_ROOM_ID;
    if (roomId !== UNASSIGNED_ROOM_ID) {
      appendUniqueRoomId(roomOrder, roomId);
    }
    for (const bedId of listBookableIdsForStayBed(bed)) {
      if (!processedIds.has(bedId)) {
        pushEntry(roomId, bedId);
      }
    }
  }

  for (const bedId of configuredBedIds) {
    if (processedIds.has(bedId)) continue;
    const parent = findStayBedForGuestId(configBeds, bedId);
    if (parent && isInternalBunkUnitId(parent, bedId)) continue;
    pushEntry(resolveRoomIdForBedId(configBeds, bedId), bedId);
  }

  if (entriesByRoom.has(UNASSIGNED_ROOM_ID)) {
    appendUniqueRoomId(roomOrder, UNASSIGNED_ROOM_ID);
  }

  const roomGroups: BedInventoryRoomGroup[] = roomOrder
    .map((roomId) => {
      const beds = entriesByRoom.get(roomId) ?? [];
      if (beds.length === 0) return null;
      return {
        roomId,
        roomLabel: resolveRoomLabel(guestStay, roomId),
        beds,
      };
    })
    .filter((group): group is BedInventoryRoomGroup => group !== null);

  const orphanStays = activeStays.filter(
    (stay) => !configuredBedIds.has(stay.bed_id) && guestAccessCoversNight(stay, nightDate)
  );

  return { roomGroups, orphanStays };
}

export function flattenBedInventory(snapshot: BedInventorySnapshot): BedInventoryEntry[] {
  return snapshot.roomGroups.flatMap((group) => group.beds);
}
