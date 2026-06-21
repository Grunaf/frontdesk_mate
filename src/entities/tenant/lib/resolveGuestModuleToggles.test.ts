import { describe, expect, it } from 'vitest';
import {
  isHouseRulesModuleEnabled,
  isRoomMapModuleEnabled,
} from './resolveGuestModuleToggles';

describe('resolveGuestModuleToggles', () => {
  it('room map off when preview bed or guest stay is incomplete', () => {
    expect(isRoomMapModuleEnabled({})).toBe(false);
    expect(isRoomMapModuleEnabled({ highlightedBedId: '4B' })).toBe(false);
    expect(
      isRoomMapModuleEnabled({
        guestStay: {
          floors: [{ id: '1', label: '1' }],
          rooms: [{ id: 'r1', label: 'Room 1', floorId: '1' }],
          beds: [],
        },
      })
    ).toBe(false);
  });

  it('room map on when preview bed and minimal guest stay exist', () => {
    expect(
      isRoomMapModuleEnabled({
        highlightedBedId: '4B',
        guestStay: {
          floors: [{ id: '1', label: '1' }],
          rooms: [{ id: 'r1', label: 'Dorm A', floorId: '1' }],
          beds: [{ id: '4B', roomId: 'r1' }],
        },
      })
    ).toBe(true);
  });

  it('house rules off when no valid enabled rules exist', () => {
    expect(isHouseRulesModuleEnabled({})).toBe(false);
    expect(isHouseRulesModuleEnabled({ houseRules: [] })).toBe(false);
    expect(
      isHouseRulesModuleEnabled({
        houseRules: [{ id: 'alcohol', templateId: 'alcohol', enabled: true }],
      })
    ).toBe(true);
    expect(isHouseRulesModuleEnabled({ activeRulesKeys: ['quietHours'] })).toBe(true);
  });
});
