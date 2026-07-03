import { describe, expect, it } from 'vitest';
import {
  getFirstRoomMapReadinessGap,
  resolveRoomMapReadiness,
} from './resolveRoomMapReadiness';
import type { TenantSettings } from '../model/settings';

const readyGuestStay: NonNullable<TenantSettings['guestStay']> = {
  floors: [{ id: '1', label: 'Floor 1' }],
  rooms: [{ id: 'r1', label: 'Room 1', floorId: '1' }],
  beds: [{ id: '4B', roomId: 'r1', x: 10, y: 20 }],
};

describe('resolveRoomMapReadiness', () => {
  it('flags missing beds as first gap', () => {
    const steps = resolveRoomMapReadiness({ settings: {} });
    const bedsStep = steps.find((step) => step.id === 'bed-exists');

    expect(bedsStep?.complete).toBe(false);
    expect(getFirstRoomMapReadinessGap({})).toBe('Add at least one bed in a room below');
  });

  it('requires wayfinding content', () => {
    const settings: TenantSettings = {
      guestStay: {
        floors: [{ id: '1', label: '1' }],
        rooms: [{ id: 'r1', label: 'Room', floorId: '1' }],
        beds: [{ id: '4B', roomId: 'r1' }],
      },
    };

    const wayfinding = resolveRoomMapReadiness({ settings }).find((step) => step.id === 'wayfinding');
    expect(wayfinding?.complete).toBe(false);
    expect(wayfinding?.message).toContain('Place beds on map');
  });

  it('passes when beds and layout coordinates exist', () => {
    const settings: TenantSettings = {
      guestStay: readyGuestStay,
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
