import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from './resolveCapabilities';
import type { TenantSettings } from '../model/settings';

const guestStayShell: TenantSettings['guestStay'] = {
  floors: [{ id: '1', label: 'Floor 1' }],
  rooms: [{ id: 'r1', label: 'Room 1', floorId: '1' }],
  beds: [{ id: '4B', roomId: 'r1' }],
};

describe('resolveCapabilities', () => {
  it('hides room map until module structure is enabled', () => {
    const caps = resolveCapabilities({
      cityPackId: 'sarajevo',
      settings: {},
    });

    expect(caps.roomMap).toBe('hidden');
  });

  it('marks enabled room map as preview until wayfinding is ready', () => {
    const caps = resolveCapabilities({
      cityPackId: 'sarajevo',
      settings: {
        guestStay: guestStayShell,
      },
    });

    expect(caps.roomMap).toBe('preview');
  });

  it('marks room map as ready when required setup steps are complete', () => {
    const caps = resolveCapabilities({
      cityPackId: 'sarajevo',
      settings: {
        guestStay: {
          ...guestStayShell,
          beds: [{ id: '4B', roomId: 'r1', x: 10, y: 20 }],
        },
      },
    });

    expect(caps.roomMap).toBe('ready');
  });

  it('hides house rules when module is off', () => {
    const caps = resolveCapabilities({
      cityPackId: 'sarajevo',
      settings: {},
    });

    expect(caps.faq).toBe('hidden');
  });

  it('marks enabled but empty house rules as preview', () => {
    const caps = resolveCapabilities({
      cityPackId: 'sarajevo',
      settings: { houseRules: [] },
    });

    expect(caps.faq).toBe('preview');
  });

  it('marks house rules as ready when valid rules exist', () => {
    const caps = resolveCapabilities({
      cityPackId: 'sarajevo',
      settings: {
        houseRules: [{ id: 'alcohol', templateId: 'alcohol', enabled: true }],
      },
    });

    expect(caps.faq).toBe('ready');
  });

  it('marks local guide ready only when city pack gate is true', () => {
    expect(
      resolveCapabilities({ cityPackId: 'sarajevo', settings: {}, cityPackHasPlaces: true }).localGuide
    ).toBe('ready');
    expect(
      resolveCapabilities({ cityPackId: 'sarajevo', settings: {}, cityPackHasPlaces: false }).localGuide
    ).toBe('hidden');
    expect(resolveCapabilities({ cityPackId: 'kotor', settings: {} }).localGuide).toBe('hidden');
  });

  it('hides booking on lead-gen landing lifecycles even when engine is configured', () => {
    const settings: TenantSettings = {
      booking: { provider: 'cloudbeds', engineId: '12345' },
    };

    expect(
      resolveCapabilities({ cityPackId: 'sarajevo', settings, lifecycleStatus: 'expired' }).booking
    ).toBe('hidden');
    expect(
      resolveCapabilities({ cityPackId: 'sarajevo', settings, lifecycleStatus: 'scheduled' }).booking
    ).toBe('hidden');
    expect(
      resolveCapabilities({ cityPackId: 'sarajevo', settings, lifecycleStatus: 'active' }).booking
    ).toBe('ready');
  });
});
