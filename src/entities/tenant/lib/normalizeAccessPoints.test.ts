import { describe, expect, it } from 'vitest';
import {
  filterAccessPointsForGuest,
  normalizeAccessPoints,
  resolveGuestFloor,
} from './normalizeAccessPoints';
import type { TenantSettings } from '../model/settings';

describe('normalizeAccessPoints', () => {
  it('reads explicit access points from settings', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        accessPoints: [
          { id: 'building_entrance', kind: 'outside', code: 'A1', sortOrder: 0 },
          { id: 'floor_1', kind: 'zone', code: 'B2', sortOrder: 1 },
        ],
      },
    };

    expect(normalizeAccessPoints(settings).map((point) => point.id)).toEqual([
      'building_entrance',
      'floor_1',
    ]);
  });

  it('returns empty list when access points are not configured', () => {
    expect(normalizeAccessPoints({})).toEqual([]);
  });
});

describe('filterAccessPointsForGuest', () => {
  const points = [
    { id: 'building_entrance', label: 'Outside', forFloors: [] as string[] },
    { id: 'floor_1', label: 'F1', forFloors: ['1'], alsoForFloors: ['2'] },
    { id: 'floor_2', label: 'F2', forFloors: ['2'], alsoForFloors: ['1'] },
  ];

  it('shows all points when guest floor is unknown', () => {
    expect(filterAccessPointsForGuest(points, null)).toHaveLength(3);
  });

  it('shows cross-floor kitchen access for floor 2 guest', () => {
    const visible = filterAccessPointsForGuest(points, '2').map((point) => point.id);
    expect(visible).toContain('building_entrance');
    expect(visible).toContain('floor_1');
    expect(visible).toContain('floor_2');
  });

  it('resolves guest floor from bed map', () => {
    const settings: TenantSettings = {
      highlightedBedId: '4B',
      arrivalAccess: { bedFloorMap: { '4B': '2' } },
    };

    expect(resolveGuestFloor(settings)).toBe('2');
  });

  it('prefers guest stay bed → room → floor over bedFloorMap', () => {
    const settings: TenantSettings = {
      highlightedBedId: '4B',
      arrivalAccess: { bedFloorMap: { '4B': '1' } },
      guestStay: {
        rooms: [{ id: 'vega', label: 'Vega', floorId: '2' }],
        beds: [{ id: '4B', roomId: 'vega' }],
      },
    };

    expect(resolveGuestFloor(settings)).toBe('2');
  });

  it('resolves floor from bunk tier in guest stay', () => {
    const settings: TenantSettings = {
      highlightedBedId: '4A-Top',
      guestStay: {
        rooms: [{ id: 'vega', label: 'Vega', floorId: '2' }],
        beds: [
          {
            id: '4A',
            roomId: 'vega',
            x: 30,
            y: 30,
            bedType: 'bunk',
            topId: '4A-Top',
            bottomId: '4A-Bot',
          },
        ],
      },
    };

    expect(resolveGuestFloor(settings)).toBe('2');
  });
});
