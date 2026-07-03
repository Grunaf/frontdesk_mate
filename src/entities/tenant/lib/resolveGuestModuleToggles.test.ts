import { describe, expect, it } from 'vitest';
import {
  isHouseRulesModuleEnabled,
  isHouseRulesModuleTracked,
  isRoomMapModuleEnabled,
} from './resolveGuestModuleToggles';

describe('resolveGuestModuleToggles', () => {
  it('requires guest stay structure for room map', () => {
    expect(isRoomMapModuleEnabled({})).toBe(false);
    expect(isRoomMapModuleEnabled({ guestStay: { beds: [{ id: '4B', roomId: 'r1' }] } })).toBe(
      false
    );
    expect(
      isRoomMapModuleEnabled({
        guestStay: {
          floors: [{ id: '1', label: '1' }],
          rooms: [{ id: 'r1', label: 'Room', floorId: '1' }],
          beds: [{ id: '4B', roomId: 'r1' }],
        },
      })
    ).toBe(true);
  });

  it('tracks house rules module from settings shape', () => {
    expect(isHouseRulesModuleTracked({})).toBe(false);
    expect(isHouseRulesModuleTracked({ houseRules: [] })).toBe(true);
    expect(isHouseRulesModuleEnabled({ houseRules: [] })).toBe(false);
  });
});
