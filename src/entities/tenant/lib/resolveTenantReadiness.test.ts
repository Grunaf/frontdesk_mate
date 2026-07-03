import { describe, expect, it } from 'vitest';
import { sarajevoReadyGateSnapshot } from '@/entities/city-pack/lib/testFixtures/cityPackGateSnapshot';
import {
  buildTenantReadinessInput,
  getTenantModuleSummary,
  getTenantReadinessSummary,
  getTenantSetupSummaries,
  resolveTenantChecklistItems,
  resolveTenantReadiness,
} from './resolveTenantReadiness';
import type { TenantSettings } from '../model/settings';

const activeLifecycle = {
  archived_at: null,
  subscription_starts_at: '2026-01-01T00:00:00.000Z',
  subscription_ends_at: '2027-01-01T23:59:59.999Z',
  is_active: true,
  cityPackGateSnapshot: sarajevoReadyGateSnapshot,
};

const baseSettings: TenantSettings = {
  checkInTime: '14:00',
  wifi: { name: 'Guest', password: 'secret' },
  contacts: {
    phoneRaw: '38761111111',
    address: 'Main street 1',
  },
  arrivalAccess: {
    accessPoints: [{ id: 'main', kind: 'outside', label: 'Main', sortOrder: 0, code: '1234' }],
  },
  arrivalWalkToHostel: { en: 'Walk from the hub to {address}.' },
  heroBgUrl: '/hero.jpg',
  houseRules: [
    {
      id: 'quiet-hours',
      templateId: 'quietHours',
      enabled: true,
      params: { from: '22:00', to: '08:00' },
    },
  ],
  guestStay: {
    floors: [{ id: '1', label: 'Floor 1' }],
    rooms: [{ id: 'r1', label: 'Room 1', floorId: '1' }],
    beds: [{ id: '4B', roomId: 'r1', x: 10, y: 20 }],
  },
};

describe('resolveTenantReadiness', () => {
  it('marks fully configured tenant as complete', () => {
    const input = buildTenantReadinessInput({
      slug: 'balkanhan',
      name: 'Balkan Han',
      cityPackId: 'sarajevo',
      settings: baseSettings,
      ...activeLifecycle,
    });
    const items = resolveTenantReadiness(input);
    const summary = getTenantReadinessSummary(items);

    expect(summary.incompleteItems).toHaveLength(0);
    expect(summary.completeCount).toBe(summary.totalCount);
  });

  it('does not include expired subscription in checklist blockers', () => {
    const input = buildTenantReadinessInput({
      slug: 'balkanhan',
      name: 'Balkan Han',
      cityPackId: 'sarajevo',
      settings: baseSettings,
      archived_at: null,
      subscription_starts_at: '2024-01-01T00:00:00.000Z',
      subscription_ends_at: '2024-12-31T23:59:59.999Z',
      is_active: true,
    });

    expect(input.lifecycleStatus).toBe('expired');
    expect(resolveTenantReadiness(input).some((item) => item.id === 'subscription-live')).toBe(false);

    const summary = getTenantReadinessSummary(resolveTenantChecklistItems(input));
    expect(summary.blockerIncomplete.some((item) => item.id === 'subscription-live')).toBe(false);
  });

  it('does not include scheduled subscription in checklist blockers', () => {
    const input = buildTenantReadinessInput({
      slug: 'balkanhan',
      name: 'Balkan Han',
      cityPackId: 'sarajevo',
      settings: baseSettings,
      archived_at: null,
      subscription_starts_at: '2030-01-01T00:00:00.000Z',
      subscription_ends_at: '2031-01-01T23:59:59.999Z',
      is_active: true,
    });

    expect(input.lifecycleStatus).toBe('scheduled');
    expect(resolveTenantChecklistItems(input).some((item) => item.id === 'subscription-live')).toBe(false);
  });

  it('does not include archived subscription in checklist blockers', () => {
    const input = buildTenantReadinessInput({
      slug: 'balkanhan',
      name: 'Balkan Han',
      cityPackId: 'sarajevo',
      settings: baseSettings,
      archived_at: '2026-01-01T00:00:00.000Z',
      subscription_starts_at: '2024-01-01T00:00:00.000Z',
      subscription_ends_at: '2027-01-01T23:59:59.999Z',
      is_active: false,
    });

    expect(input.lifecycleStatus).toBe('archived');
    expect(resolveTenantChecklistItems(input).some((item) => item.id === 'subscription-live')).toBe(false);
  });

  it('requires booking config only when provider is enabled', () => {
    const withoutBooking = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo',
      settings: { ...baseSettings, booking: { provider: 'none' } },
      ...activeLifecycle,
    });

    expect(resolveTenantReadiness(withoutBooking).some((item) => item.id === 'booking-engine')).toBe(
      false
    );

    const withBooking = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo',
      settings: { ...baseSettings, booking: { provider: 'cloudbeds' } },
      ...activeLifecycle,
    });

    const bookingItem = resolveTenantReadiness(withBooking).find((item) => item.id === 'booking-engine');
    expect(bookingItem?.status).toBe('incomplete');

    const completeBooking = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo',
      settings: {
        ...baseSettings,
        booking: { provider: 'cloudbeds', engineId: 'ABC123' },
      },
      ...activeLifecycle,
    });

    expect(
      resolveTenantReadiness(completeBooking).find((item) => item.id === 'booking-engine')?.status
    ).toBe('complete');
  });

  it('sorts incomplete blockers before recommended gaps', () => {
    const input = buildTenantReadinessInput({
      slug: '',
      name: '',
      cityPackId: 'sarajevo',
      settings: {},
      ...activeLifecycle,
    });

    const items = resolveTenantReadiness(input);
    const firstIncompleteIndex = items.findIndex((item) => item.status === 'incomplete');
    expect(items[firstIncompleteIndex]?.tier).toBe('blocker');
  });

  it('flags booking-for-landing when room cards exist without booking engine', () => {
    const input = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo',
      settings: {
        ...baseSettings,
        booking: { provider: 'none' },
        landing: {
          roomTypes: [
            {
              id: 'dorm',
              engineRoomTypeId: 'DORM8',
              title: 'Dorm',
              description: 'Shared',
              imageUrl: '/room.jpg',
            },
          ],
        },
      },
      ...activeLifecycle,
    });

    const gap = resolveTenantReadiness(input).find((item) => item.id === 'booking-engine');
    expect(gap?.status).toBe('incomplete');
    expect(gap?.sectionId).toBe('booking');
  });

  it('excludes section-only guest app items from checklist', () => {
    const input = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'kotor',
      settings: {},
      ...activeLifecycle,
    });

    const checklist = resolveTenantChecklistItems(input);
    expect(checklist.some((item) => item.id === 'guest-room-map')).toBe(false);
    expect(checklist.some((item) => item.id === 'guest-house-rules')).toBe(false);
    expect(checklist.some((item) => item.id === 'guest-local-guide')).toBe(false);

    const all = resolveTenantReadiness(input);
    expect(all.find((item) => item.id === 'guest-room-map')?.surface).toBe('section');
  });

  it('includes guest app readiness items in full resolver', () => {
    const input = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'kotor',
      settings: {},
      ...activeLifecycle,
    });

    const items = resolveTenantReadiness(input);
    expect(items.find((item) => item.id === 'guest-room-map')?.status).toBe('incomplete');
    expect(items.find((item) => item.id === 'guest-house-rules')?.status).toBe('incomplete');
    expect(items.find((item) => item.id === 'guest-local-guide')?.status).toBe('incomplete');
  });

  it('splits config and module summaries for empty tenant', () => {
    const input = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'kotor',
      settings: {},
      ...activeLifecycle,
    });

    const setup = getTenantSetupSummaries(input);

    expect(setup.config.incompleteItems.length).toBeGreaterThan(0);
    expect(setup.modules.trackedCount).toBe(0);
    expect(setup.modules.liveCount).toBe(0);
    expect(setup.modules.gapCount).toBe(0);
    expect(setup.modules.incompleteModules).toHaveLength(0);
  });

  it('auto-counts local guide as live when city pack has places', () => {
    const input = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo',
      settings: {},
      ...activeLifecycle,
    });

    const setup = getTenantSetupSummaries(input);

    expect(setup.modules.trackedCount).toBe(1);
    expect(setup.modules.liveCount).toBe(1);
    expect(setup.modules.incompleteModules).toHaveLength(0);
  });

  it('marks fully configured tenant config and modules as complete', () => {
    const input = buildTenantReadinessInput({
      slug: 'balkanhan',
      name: 'Balkan Han',
      cityPackId: 'sarajevo',
      settings: baseSettings,
      ...activeLifecycle,
    });

    const setup = getTenantSetupSummaries(input);

    expect(setup.config.incompleteItems).toHaveLength(0);
    expect(setup.modules.trackedCount).toBe(3);
    expect(setup.modules.liveCount).toBe(setup.modules.trackedCount);
    expect(setup.modules.gapCount).toBe(0);
  });

  it('counts house rules preview as module gap while config can be complete', () => {
    const { houseRules: _rules, activeRulesKeys: _legacy, ...settingsWithoutRules } = baseSettings;
    const input = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo',
      settings: { ...settingsWithoutRules, houseRules: [] },
      ...activeLifecycle,
    });

    const setup = getTenantSetupSummaries(input);

    expect(setup.config.incompleteItems).toHaveLength(0);
    expect(setup.modules.trackedCount).toBe(3);
    expect(setup.modules.gapCount).toBe(1);
    expect(setup.modules.incompleteModules.some((item) => item.id === 'guest-house-rules')).toBe(true);
  });

  it('excludes hidden room map from module denominator', () => {
    const input = buildTenantReadinessInput({
      slug: 'demo',
      name: 'Demo',
      cityPackId: 'sarajevo',
      settings: {
        checkInTime: '14:00',
        wifi: { name: 'Guest', password: 'secret' },
        contacts: { phoneRaw: '38761111111', address: 'Main street 1' },
        arrivalAccess: {
          accessPoints: [{ id: 'main', kind: 'outside', label: 'Main', sortOrder: 0, code: '1234' }],
        },
        heroBgUrl: '/hero.jpg',
        activeRulesKeys: ['quietHours'],
      },
      ...activeLifecycle,
    });

    const modules = getTenantModuleSummary(input);

    expect(modules.trackedCount).toBe(2);
    expect(modules.liveCount).toBe(2);
    expect(modules.incompleteModules).toHaveLength(0);
  });
});
