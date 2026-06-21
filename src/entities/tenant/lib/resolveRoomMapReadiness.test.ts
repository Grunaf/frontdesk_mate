import { describe, expect, it } from 'vitest';
import {
  getFirstRoomMapReadinessGap,
  resolveRoomMapReadiness,
} from './resolveRoomMapReadiness';
import type { TenantSettings } from '../model/settings';

describe('resolveRoomMapReadiness', () => {
  it('flags missing active bed as first gap', () => {
    const steps = resolveRoomMapReadiness({ settings: {} });
    const activeBed = steps.find((step) => step.id === 'active-bed');

    expect(activeBed?.complete).toBe(false);
    expect(activeBed?.message).toBe('Choose preview bed on the map');
    expect(getFirstRoomMapReadinessGap({})).toBe('Choose preview bed on the map');
  });

  it('flags bed id not found in guest stay', () => {
    const settings: TenantSettings = {
      highlightedBedId: '4B',
      guestStay: {
        beds: [{ id: '1A', roomId: 'r1' }],
      },
    };

    const bedExists = resolveRoomMapReadiness({ settings }).find((step) => step.id === 'bed-exists');
    expect(bedExists?.complete).toBe(false);
    expect(bedExists?.message).toContain('not found on map');
  });

  it('requires wayfinding content', () => {
    const settings: TenantSettings = {
      highlightedBedId: '4B',
      guestStay: {
        beds: [{ id: '4B', roomId: 'r1' }],
      },
    };

    const wayfinding = resolveRoomMapReadiness({ settings }).find((step) => step.id === 'wayfinding');
    expect(wayfinding?.complete).toBe(false);
    expect(wayfinding?.message).toContain('Place beds on map');
  });

  it('passes when bed id and layout coordinates exist', () => {
    const settings: TenantSettings = {
      highlightedBedId: '4B',
      guestStay: {
        floors: [{ id: '1', label: 'Floor 1' }],
        rooms: [{ id: 'r1', label: 'Room 1', floorId: '1' }],
        beds: [{ id: '4B', roomId: 'r1', x: 10, y: 20 }],
      },
    };

    const required = resolveRoomMapReadiness({ settings }).filter((step) => step.tier === 'required');
    expect(required.every((step) => step.complete)).toBe(true);
    expect(getFirstRoomMapReadinessGap(settings)).toBeUndefined();
  });

  it('omits subscription info step for non-active lifecycle states', () => {
    for (const lifecycleStatus of ['expired', 'scheduled', 'archived'] as const) {
      const steps = resolveRoomMapReadiness({
        settings: {},
        lifecycleStatus,
      });

      expect(steps.some((step) => step.id === 'subscription')).toBe(false);
    }
  });
});
