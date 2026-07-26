import {
  DEFAULT_PLAN_QUICK_FILTERS,
  PLAN_QUICK_FILTER_ALL,
  type PlanQuickFiltersState,
} from './filterPlanRoomGroupsByQuickFilters';

const STORAGE_PREFIX = 'reception.plan.filters.v1:';

export function planQuickFiltersStorageKey(tenantSlug: string): string {
  return `${STORAGE_PREFIX}${tenantSlug.trim()}`;
}

function isFilterId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseFilters(raw: unknown): PlanQuickFiltersState | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const floorId = isFilterId(record.floorId) ? record.floorId.trim() : null;
  const offerId = isFilterId(record.offerId) ? record.offerId.trim() : null;
  const roomId = isFilterId(record.roomId) ? record.roomId.trim() : null;
  if (!floorId || !offerId || !roomId) return null;
  return { floorId, offerId, roomId };
}

export function readPlanQuickFilters(tenantSlug: string): PlanQuickFiltersState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_PLAN_QUICK_FILTERS };
  }

  const slug = tenantSlug.trim();
  if (!slug) {
    return { ...DEFAULT_PLAN_QUICK_FILTERS };
  }

  try {
    const raw = window.localStorage.getItem(planQuickFiltersStorageKey(slug));
    if (!raw) {
      return { ...DEFAULT_PLAN_QUICK_FILTERS };
    }
    const parsed = parseFilters(JSON.parse(raw) as unknown);
    if (!parsed) {
      return { ...DEFAULT_PLAN_QUICK_FILTERS };
    }
    return parsed;
  } catch {
    return { ...DEFAULT_PLAN_QUICK_FILTERS };
  }
}

export function writePlanQuickFilters(
  tenantSlug: string,
  filters: PlanQuickFiltersState
): void {
  if (typeof window === 'undefined') return;
  const slug = tenantSlug.trim();
  if (!slug) return;

  const payload: PlanQuickFiltersState = {
    floorId: filters.floorId.trim() || PLAN_QUICK_FILTER_ALL,
    offerId: filters.offerId.trim() || PLAN_QUICK_FILTER_ALL,
    roomId: filters.roomId.trim() || PLAN_QUICK_FILTER_ALL,
  };

  try {
    window.localStorage.setItem(planQuickFiltersStorageKey(slug), JSON.stringify(payload));
  } catch {
    // Ignore quota / private mode failures.
  }
}
