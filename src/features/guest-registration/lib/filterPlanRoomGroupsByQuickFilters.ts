import type { TenantSettings } from '@/entities/tenant';
import { listStayOffers } from '@/entities/tenant';
import type { BedDayCalendarRoomGroup } from './resolveBedDayCalendar';

export const PLAN_QUICK_FILTER_ALL = 'all' as const;

export type PlanQuickFiltersState = {
  floorId: typeof PLAN_QUICK_FILTER_ALL | string;
  offerId: typeof PLAN_QUICK_FILTER_ALL | string;
  roomId: typeof PLAN_QUICK_FILTER_ALL | string;
};

export const DEFAULT_PLAN_QUICK_FILTERS: PlanQuickFiltersState = {
  floorId: PLAN_QUICK_FILTER_ALL,
  offerId: PLAN_QUICK_FILTER_ALL,
  roomId: PLAN_QUICK_FILTER_ALL,
};

export type PlanRoomFilterMeta = {
  roomId: string;
  floorId: string | null;
  offerId: string | null;
  label: string;
};

type RoomIndex = Map<string, PlanRoomFilterMeta>;

function buildRoomIndex(settings: TenantSettings): RoomIndex {
  const rooms = settings.guestStay?.rooms ?? [];
  const index: RoomIndex = new Map();
  for (const room of rooms) {
    const roomId = room.id.trim();
    if (!roomId) continue;
    index.set(roomId, {
      roomId,
      floorId: room.floorId?.trim() || null,
      offerId: room.offerId?.trim() || null,
      label: room.label.trim() || roomId,
    });
  }
  return index;
}

export function isPlanQuickFiltersActive(filters: PlanQuickFiltersState): boolean {
  return (
    filters.floorId !== PLAN_QUICK_FILTER_ALL ||
    filters.offerId !== PLAN_QUICK_FILTER_ALL ||
    filters.roomId !== PLAN_QUICK_FILTER_ALL
  );
}

export function roomMatchesQuickFilters(
  meta: PlanRoomFilterMeta | undefined,
  filters: PlanQuickFiltersState,
  roomId: string
): boolean {
  if (filters.roomId !== PLAN_QUICK_FILTER_ALL && roomId !== filters.roomId) {
    return false;
  }

  if (filters.floorId !== PLAN_QUICK_FILTER_ALL) {
    if (!meta?.floorId || meta.floorId !== filters.floorId) {
      return false;
    }
  }

  if (filters.offerId !== PLAN_QUICK_FILTER_ALL) {
    // Rooms without offerId are hidden when a concrete offer is selected.
    if (!meta?.offerId || meta.offerId !== filters.offerId) {
      return false;
    }
  }

  return true;
}

/** Keep room groups matching floor / offer / room (AND). Does not touch bed rows. */
export function filterPlanRoomGroupsByQuickFilters(
  roomGroups: BedDayCalendarRoomGroup[],
  settings: TenantSettings,
  filters: PlanQuickFiltersState
): BedDayCalendarRoomGroup[] {
  if (!isPlanQuickFiltersActive(filters)) {
    return roomGroups;
  }

  const index = buildRoomIndex(settings);
  return roomGroups.filter((group) =>
    roomMatchesQuickFilters(index.get(group.roomId), filters, group.roomId)
  );
}

export function listPlanFloorFilterOptions(
  settings: TenantSettings
): Array<{ id: string; label: string }> {
  const floors = settings.guestStay?.floors ?? [];
  return floors
    .map((floor) => {
      const id = floor.id.trim();
      if (!id) return null;
      const label = floor.label?.trim() || id;
      return { id, label };
    })
    .filter((entry): entry is { id: string; label: string } => entry !== null);
}

export function listPlanRoomFilterOptions(
  settings: TenantSettings,
  filters: Pick<PlanQuickFiltersState, 'floorId' | 'offerId'>
): PlanRoomFilterMeta[] {
  const index = buildRoomIndex(settings);
  return [...index.values()]
    .filter((meta) =>
      roomMatchesQuickFilters(
        meta,
        {
          floorId: filters.floorId,
          offerId: filters.offerId,
          roomId: PLAN_QUICK_FILTER_ALL,
        },
        meta.roomId
      )
    )
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

/** Drop stale ids that no longer exist in settings. */
export function sanitizePlanQuickFilters(
  filters: PlanQuickFiltersState,
  settings: TenantSettings
): PlanQuickFiltersState {
  const floors = new Set(listPlanFloorFilterOptions(settings).map((floor) => floor.id));
  const rooms = buildRoomIndex(settings);
  const offers = new Set(listStayOffers(settings).map((offer) => offer.id));

  const floorId =
    filters.floorId === PLAN_QUICK_FILTER_ALL || floors.has(filters.floorId)
      ? filters.floorId
      : PLAN_QUICK_FILTER_ALL;
  const offerId =
    filters.offerId === PLAN_QUICK_FILTER_ALL || offers.has(filters.offerId)
      ? filters.offerId
      : PLAN_QUICK_FILTER_ALL;
  let roomId =
    filters.roomId === PLAN_QUICK_FILTER_ALL || rooms.has(filters.roomId)
      ? filters.roomId
      : PLAN_QUICK_FILTER_ALL;

  if (roomId !== PLAN_QUICK_FILTER_ALL) {
    const meta = rooms.get(roomId);
    if (!roomMatchesQuickFilters(meta, { floorId, offerId, roomId: PLAN_QUICK_FILTER_ALL }, roomId)) {
      roomId = PLAN_QUICK_FILTER_ALL;
    }
  }

  return { floorId, offerId, roomId };
}
