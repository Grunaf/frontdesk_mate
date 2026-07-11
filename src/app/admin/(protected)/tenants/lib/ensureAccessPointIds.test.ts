import { describe, expect, it } from 'vitest';
import type { AccessPoint } from '@/entities/tenant';
import {
  ensureAccessPointIds,
  mergeAccessPointDisplayFloors,
  proposeAccessPointId,
} from './ensureAccessPointIds';

describe('mergeAccessPointDisplayFloors', () => {
  it('merges forFloors and alsoForFloors without duplicates', () => {
    const point: AccessPoint = {
      id: 'x',
      forFloors: ['1', '2'],
      alsoForFloors: ['2', '3'],
    };
    expect(mergeAccessPointDisplayFloors(point)).toEqual(['1', '2', '3']);
  });
});

describe('proposeAccessPointId', () => {
  it('uses building_entrance for first outside in building_then_zones', () => {
    const point: AccessPoint = { id: 'tmp', kind: 'outside' };
    expect(proposeAccessPointId(point, 0, 'building_then_zones', [point])).toBe('building_entrance');
  });

  it('uses outside_{index} for non-primary outside doors', () => {
    const outside: AccessPoint = { id: 'tmp', kind: 'outside' };
    const zone: AccessPoint = { id: 'z', kind: 'zone' };
    expect(proposeAccessPointId(outside, 1, 'building_then_zones', [
      { id: 'building_entrance', kind: 'outside' },
      outside,
      zone,
    ])).toBe('outside_1');
  });

  it('uses floor_{floorId} for zone with exactly one floor chip', () => {
    const point: AccessPoint = { id: 'tmp', kind: 'zone', forFloors: ['2'] };
    expect(proposeAccessPointId(point, 1, 'direct_to_floor', [point])).toBe('floor_2');
  });

  it('uses zone_{index} for zone without a single floor chip', () => {
    const point: AccessPoint = { id: 'tmp', kind: 'zone', forFloors: ['1', '2'] };
    expect(proposeAccessPointId(point, 2, 'direct_to_floor', [point])).toBe('zone_2');
  });
});

describe('ensureAccessPointIds', () => {
  it('sets sortOrder from array index', () => {
    const points: AccessPoint[] = [
      { id: 'building_entrance', kind: 'outside' },
      { id: 'floor_1', kind: 'zone' },
    ];
    const stable = new Set(['building_entrance', 'floor_1']);
    const result = ensureAccessPointIds(points, 'building_then_zones', stable);
    expect(result.map((p) => p.sortOrder)).toEqual([0, 1]);
  });

  it('preserves stable ids from loaded settings', () => {
    const points: AccessPoint[] = [{ id: 'hostel_door', kind: 'zone', label: 'Hostel door' }];
    const stable = new Set(['hostel_door']);
    expect(ensureAccessPointIds(points, 'direct_to_floor', stable)[0].id).toBe('hostel_door');
  });

  it('replaces emptyPoint default floor_{index} for new rows', () => {
    const points: AccessPoint[] = [
      { id: 'building_entrance', kind: 'outside' },
      { id: 'floor_1', kind: 'zone', forFloors: ['1'] },
    ];
    const stable = new Set(['building_entrance']);
    const result = ensureAccessPointIds(points, 'building_then_zones', stable);
    expect(result[1].id).toBe('floor_1');
  });

  it('recalculates auto-generated id when kind toggles to outside', () => {
    const points: AccessPoint[] = [{ id: 'zone_0', kind: 'outside' }];
    const result = ensureAccessPointIds(points, 'building_then_zones', new Set());
    expect(result[0].id).toBe('building_entrance');
  });
});
