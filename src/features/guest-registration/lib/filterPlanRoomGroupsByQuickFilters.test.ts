import { describe, expect, it } from 'vitest';
import type { TenantSettings } from '@/entities/tenant';
import type { BedDayCalendarRoomGroup } from './resolveBedDayCalendar';
import {
  DEFAULT_PLAN_QUICK_FILTERS,
  filterPlanRoomGroupsByQuickFilters,
  isPlanQuickFiltersActive,
  listPlanRoomFilterOptions,
  sanitizePlanQuickFilters,
} from './filterPlanRoomGroupsByQuickFilters';

const settings: TenantSettings = {
  guestStay: {
    floors: [
      { id: '1', label: '1' },
      { id: '2', label: '2' },
    ],
    rooms: [
      { id: 'room-a', label: 'A', floorId: '1', offerId: 'dorm' },
      { id: 'room-b', label: 'B', floorId: '1', offerId: 'female' },
      { id: 'room-c', label: 'C', floorId: '2', offerId: 'private' },
      { id: 'room-d', label: 'D', floorId: '2' },
    ],
    beds: [],
  },
  stayOffers: [
    { id: 'dorm', title: 'Mixed dorm', sortOrder: 0 },
    { id: 'female', title: 'Female dorm', sortOrder: 1 },
    { id: 'private', title: 'Private', sortOrder: 2 },
  ],
};

function group(roomId: string, roomLabel: string): BedDayCalendarRoomGroup {
  return {
    roomId,
    roomLabel,
    rows: [{ bedId: `${roomId}-1`, displayLabel: '1', cells: [] }],
  };
}

const allGroups = [
  group('room-a', 'A'),
  group('room-b', 'B'),
  group('room-c', 'C'),
  group('room-d', 'D'),
  group('__orphan__', 'Unknown beds'),
];

describe('filterPlanRoomGroupsByQuickFilters', () => {
  it('returns all groups when filters are All', () => {
    expect(filterPlanRoomGroupsByQuickFilters(allGroups, settings, DEFAULT_PLAN_QUICK_FILTERS)).toEqual(
      allGroups
    );
    expect(isPlanQuickFiltersActive(DEFAULT_PLAN_QUICK_FILTERS)).toBe(false);
  });

  it('filters by floor', () => {
    const result = filterPlanRoomGroupsByQuickFilters(allGroups, settings, {
      ...DEFAULT_PLAN_QUICK_FILTERS,
      floorId: '1',
    });
    expect(result.map((g) => g.roomId)).toEqual(['room-a', 'room-b']);
  });

  it('filters by offer and hides rooms without offerId', () => {
    const result = filterPlanRoomGroupsByQuickFilters(allGroups, settings, {
      ...DEFAULT_PLAN_QUICK_FILTERS,
      offerId: 'private',
    });
    expect(result.map((g) => g.roomId)).toEqual(['room-c']);
  });

  it('combines floor + offer (AND)', () => {
    const result = filterPlanRoomGroupsByQuickFilters(allGroups, settings, {
      floorId: '1',
      offerId: 'female',
      roomId: 'all',
    });
    expect(result.map((g) => g.roomId)).toEqual(['room-b']);
  });

  it('filters by concrete room', () => {
    const result = filterPlanRoomGroupsByQuickFilters(allGroups, settings, {
      ...DEFAULT_PLAN_QUICK_FILTERS,
      roomId: 'room-c',
    });
    expect(result.map((g) => g.roomId)).toEqual(['room-c']);
  });

  it('hides synthetic rooms when floor or offer is set', () => {
    const byFloor = filterPlanRoomGroupsByQuickFilters(allGroups, settings, {
      ...DEFAULT_PLAN_QUICK_FILTERS,
      floorId: '2',
    });
    expect(byFloor.map((g) => g.roomId)).toEqual(['room-c', 'room-d']);
  });
});

describe('listPlanRoomFilterOptions', () => {
  it('narrows room select by floor and offer', () => {
    expect(
      listPlanRoomFilterOptions(settings, { floorId: '1', offerId: 'all' }).map((r) => r.roomId)
    ).toEqual(['room-a', 'room-b']);
    expect(
      listPlanRoomFilterOptions(settings, { floorId: 'all', offerId: 'dorm' }).map((r) => r.roomId)
    ).toEqual(['room-a']);
  });
});

describe('sanitizePlanQuickFilters', () => {
  it('resets stale ids to all', () => {
    expect(
      sanitizePlanQuickFilters(
        { floorId: 'missing', offerId: 'gone', roomId: 'nope' },
        settings
      )
    ).toEqual(DEFAULT_PLAN_QUICK_FILTERS);
  });

  it('clears room when it no longer matches floor/offer', () => {
    expect(
      sanitizePlanQuickFilters(
        { floorId: '2', offerId: 'all', roomId: 'room-a' },
        settings
      )
    ).toEqual({ floorId: '2', offerId: 'all', roomId: 'all' });
  });
});
