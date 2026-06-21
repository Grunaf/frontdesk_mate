import { describe, expect, it } from 'vitest';
import {
  inferLaunchBookingPath,
  resolveFirstIncompleteLaunchStep,
  resolveGuestPathGate,
  type LaunchStepId,
} from './resolveGuestPathReadiness';
import type { TenantSettings } from '../model/settings';

const STEP_ORDER: LaunchStepId[] = [
  'identity',
  'contacts-landing',
  'booking',
  'arrival',
  'room-map',
  'rules-wifi',
  'preview',
];

const baseSettings: TenantSettings = {
  checkInTime: '14:00',
  heroBgUrl: '/images/vega/hero.jpg',
  contacts: {
    phoneRaw: '38761123456',
    address: 'Test street 1',
  },
  wifi: { name: 'VegaGuest', password: 'secret' },
  activeRulesKeys: ['quietHours'],
  houseRules: [
    {
      id: 'quiet-hours',
      templateId: 'quietHours',
      enabled: true,
      params: { from: '22:00', to: '08:00' },
    },
  ],
  arrivalAccess: {
    landmark: '/images/vega/facade.jpg',
    accessPoints: [{ id: 'floor_1', kind: 'zone', label: 'Floor 1', image: '/images/door.jpg' }],
  },
  guestStay: {
    floors: [{ id: '1', label: '1' }],
    rooms: [{ id: 'r1', label: 'Room', floorId: '1' }],
    beds: [{ id: '4B', roomId: 'r1', x: 20, y: 20, bedType: 'single' }],
  },
  highlightedBedId: '4B',
  booking: { provider: 'none' },
};

const baseInput = {
  slug: 'vega',
  name: 'Vega Hostel',
  cityPackId: 'sarajevo' as const,
  settings: baseSettings,
  lifecycleStatus: 'active' as const,
};

describe('resolveGuestPathGate', () => {
  it('is ready when all guest-path must items pass on WA path', () => {
    const gate = resolveGuestPathGate({ ...baseInput, bookingPath: 'wa' });
    expect(gate.ready).toBe(true);
    expect(gate.incompleteMust).toHaveLength(0);
  });

  it('requires booking engine on engine path without property id', () => {
    const gate = resolveGuestPathGate({
      ...baseInput,
      bookingPath: 'engine',
      settings: {
        ...baseSettings,
        booking: { provider: 'cloudbeds', engineId: '' },
      },
    });

    expect(gate.ready).toBe(false);
    expect(gate.incompleteMust.some((item) => item.id === 'booking-engine-configured')).toBe(true);
  });

  it('does not require booking engine on WA path', () => {
    const gate = resolveGuestPathGate({ ...baseInput, bookingPath: 'wa' });
    expect(gate.incompleteMust.some((item) => item.id === 'booking-engine-configured')).toBe(false);
  });

  it('requires arrival day path content', () => {
    const gate = resolveGuestPathGate({
      ...baseInput,
      bookingPath: 'wa',
      settings: {
        ...baseSettings,
        arrivalAccess: {
          landmark: '/images/vega/facade.jpg',
          accessPoints: [],
        },
      },
    });

    expect(gate.incompleteMust.some((item) => item.id === 'arrival-day-path')).toBe(true);
  });

  it('accepts booking override or reception phone for WA', () => {
    const gate = resolveGuestPathGate({
      ...baseInput,
      bookingPath: 'wa',
      settings: {
        ...baseSettings,
        contacts: {
          address: 'Test',
          bookingWhatsappPhoneRaw: '38760999888',
        },
      },
    });

    expect(gate.incompleteMust.some((item) => item.id === 'booking-wa-phone')).toBe(false);
  });

  it('uses city pack gate snapshot for local guide readiness', () => {
    const readySnapshot = {
      sarajevo: {
        readyForTenants: true,
        notReadyReason: null,
        placesCount: 12,
        routesGateMet: true,
        status: 'ready' as const,
      },
    };

    const gate = resolveGuestPathGate({
      ...baseInput,
      bookingPath: 'wa',
      cityPackGateSnapshot: readySnapshot,
    });

    expect(gate.incompleteMust.some((item) => item.id === 'identity-city-pack-places')).toBe(false);

    const draftSnapshot = {
      kotor: {
        readyForTenants: false,
        notReadyReason: 'Publish the city pack when content is complete.',
        placesCount: 2,
        routesGateMet: false,
        status: 'draft' as const,
      },
    };

    const blocked = resolveGuestPathGate({
      ...baseInput,
      cityPackId: 'kotor',
      bookingPath: 'wa',
      cityPackGateSnapshot: draftSnapshot,
    });

    expect(blocked.incompleteMust.some((item) => item.id === 'identity-city-pack-places')).toBe(true);
  });

  it('fails house rules gate when quiet hours have no times', () => {
    const gate = resolveGuestPathGate({
      ...baseInput,
      bookingPath: 'wa',
      settings: {
        ...baseSettings,
        houseRules: [{ id: 'quiet-hours', templateId: 'quietHours', enabled: true, params: {} }],
      },
    });

    expect(gate.incompleteMust.some((item) => item.id === 'guest-house-rules')).toBe(true);
  });
});

describe('inferLaunchBookingPath', () => {
  it('returns engine when provider is set', () => {
    expect(
      inferLaunchBookingPath({ booking: { provider: 'cloudbeds', engineId: 'abc' } })
    ).toBe('engine');
  });

  it('returns wa when provider is none', () => {
    expect(inferLaunchBookingPath({ booking: { provider: 'none' } })).toBe('wa');
  });
});

describe('resolveFirstIncompleteLaunchStep', () => {
  it('jumps to arrival when identity and contacts are done but arrival is missing', () => {
    const step = resolveFirstIncompleteLaunchStep(
      {
        ...baseInput,
        bookingPath: 'wa',
        settings: {
          ...baseSettings,
          arrivalAccess: { landmark: undefined, accessPoints: [] },
        },
      },
      STEP_ORDER
    );

    expect(step).toBe('arrival');
  });

  it('opens preview when all must items are complete', () => {
    const step = resolveFirstIncompleteLaunchStep({ ...baseInput, bookingPath: 'wa' }, STEP_ORDER);
    expect(step).toBe('preview');
  });
});
