import { describe, expect, it } from 'vitest';
import { resolveGuestAppModules } from './resolveGuestAppModules';
import type { TenantSettings } from '../model/settings';

describe('resolveGuestAppModules', () => {
  it('marks room map off when module is not enabled', () => {
    const modules = resolveGuestAppModules({
      cityPackId: 'sarajevo',
      settings: {},
    });

    const roomMap = modules.find((entry) => entry.id === 'roomMap');
    expect(roomMap?.status).toBe('hidden');
    expect(roomMap?.detail).toContain('Enable room map');
  });

  it('shows gap when module enabled but bed is missing', () => {
    const modules = resolveGuestAppModules({
      cityPackId: 'sarajevo',
      settings: {
        guestStay: {
          floors: [{ id: '1', label: '1' }],
          rooms: [{ id: 'r1', label: 'Room 1', floorId: '1' }],
          beds: [],
        },
      },
    });

    const roomMap = modules.find((entry) => entry.id === 'roomMap');
    expect(roomMap?.status).toBe('hidden');
    expect(roomMap?.detail).toContain('Enable room map');
  });

  it('marks house rules off when rules module is not enabled', () => {
    const modules = resolveGuestAppModules({
      cityPackId: 'sarajevo',
      settings: { houseRules: [] },
    });

    expect(modules.find((entry) => entry.id === 'houseRules')?.status).toBe('preview');
  });

  it('marks local guide live for sarajevo pack', () => {
    const modules = resolveGuestAppModules({
      cityPackId: 'sarajevo',
      settings: {},
    });

    expect(modules.find((entry) => entry.id === 'localGuide')?.status).toBe('ready');
  });

  it('marks local guide off and links to identity when pack has no places', () => {
    const modules = resolveGuestAppModules({
      cityPackId: 'kotor',
      settings: {},
    });

    const localGuide = modules.find((entry) => entry.id === 'localGuide');
    expect(localGuide?.status).toBe('hidden');
    expect(localGuide?.actionSectionId).toBe('identity');
  });

  it('marks room map live with bed id and layout coordinates', () => {
    const settings: TenantSettings = {
      highlightedBedId: '4B',
      guestStay: {
        floors: [{ id: '1', label: 'Floor 1' }],
        rooms: [{ id: 'r1', label: 'Room 1', floorId: '1' }],
        beds: [{ id: '4B', roomId: 'r1', x: 10, y: 20 }],
      },
    };

    const roomMap = resolveGuestAppModules({
      cityPackId: 'sarajevo',
      settings,
    }).find((entry) => entry.id === 'roomMap');

    expect(roomMap?.status).toBe('ready');
    expect(roomMap?.detail).toBeUndefined();
  });
});
