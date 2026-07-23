import { describe, expect, it } from 'vitest';
import { buildHostelConfig } from '@/entities/tenant/lib/buildHostelConfig';
import { resolveArrivalAccessPlan } from '@/entities/tenant/lib/resolveArrivalAccessPlan';
import type { TenantSettings } from '@/entities/tenant/model/settings';

function plan(settings: TenantSettings, isNightMode: boolean, guestBedId?: string | null) {
  return resolveArrivalAccessPlan(settings, buildHostelConfig(settings), isNightMode, guestBedId);
}

describe('resolveArrivalAccessPlan', () => {
  it('uses access points with labels for guest UI', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        layoutKind: 'building_then_zones',
        landmark: '/images/facade.jpg',
        accessPoints: [
          {
            id: 'building_entrance',
            kind: 'outside',
            label: 'Building entrance',
            image: '/images/entrance.jpg',
            code: 'A123#',
          },
          {
            id: 'floor_1',
            kind: 'zone',
            label: 'Floor 1 — kitchen',
            image: '/images/floor1.jpg',
            code: '1111*',
          },
        ],
      },
    };

    const result = plan(settings, true);

    expect(result.layoutKind).toBe('building_then_zones');
    expect(result.landmark?.imageSrc).toBe('/images/facade.jpg');
    expect(result.nightAccess?.steps.map((step) => step.label)).toEqual([
      'Building entrance',
      'Floor 1 — kitchen',
    ]);
  });

  it('filters access points by guest floor from session bed', () => {
    const settings: TenantSettings = {
      guestStay: {
        floors: [{ id: '2', label: '2' }],
        rooms: [{ id: 'r1', label: 'Room', floorId: '2' }],
        beds: [{ id: '4B', roomId: 'r1' }],
      },
      arrivalAccess: {
        layoutKind: 'building_then_zones',
        accessPoints: [
          { id: 'building_entrance', kind: 'outside', label: 'Outside', code: 'A' },
          { id: 'floor_1', kind: 'zone', label: 'Floor 1', code: '1', forFloors: ['1'], alsoForFloors: ['2'] },
          { id: 'floor_2', kind: 'zone', label: 'Floor 2', code: '2', forFloors: ['2'] },
        ],
      },
    };

    const result = plan(settings, true, '4B');

    expect(result.guestFloor).toBe('2');
    expect(result.nightAccess?.steps.map((step) => step.id)).toEqual([
      'building_entrance',
      'floor_1',
      'floor_2',
    ]);
  });

  it('supports direct-to-floor layout without outside door', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        layoutKind: 'direct_to_floor',
        dayMode: 'walk_in',
        landmark: '/images/house.jpg',
        accessPoints: [
          { id: 'floor_2', kind: 'zone', label: 'Floor 2', forFloors: ['2'] },
        ],
      },
    };

    const result = plan(settings, false);

    expect(result.layoutKind).toBe('direct_to_floor');
    expect(result.dayAccess?.mode).toBe('walk_in');
    expect(result.dayAccess?.steps).toHaveLength(0);
  });

  it('night step without code is wayfinding only (no missing-code state)', () => {
    const settings: TenantSettings = {
      arrivalAccess: {
        accessPoints: [
          {
            id: 'floor_1',
            label: 'Floor 1',
            image: '/door.jpg',
            guideNote: 'Stairs on the left, basement door.',
          },
        ],
      },
    };

    const result = plan(settings, true);

    expect(result.nightAccess?.steps[0]?.showCode).toBe(false);
    expect(result.nightAccess?.steps[0]?.guideNote).toBe('Stairs on the left, basement door.');
    expect(result.nightAccess?.hasAnyCode).toBe(false);
  });
});
