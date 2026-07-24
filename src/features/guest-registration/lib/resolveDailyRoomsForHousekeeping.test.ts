import { describe, expect, it } from 'vitest';
import {
  collectRoomIdsToMarkNotCleaned,
  listHousekeepingInventoryRoomIds,
  shouldMarkRoomNotCleaned,
} from './resolveDailyRoomsForHousekeeping';

describe('listHousekeepingInventoryRoomIds', () => {
  it('unions rooms and bed roomIds, skips synthetic', () => {
    expect(
      listHousekeepingInventoryRoomIds({
        rooms: [{ id: 'r1' }, { id: '__orphan' }],
        beds: [{ roomId: 'r1' }, { roomId: 'r2' }],
      }).sort()
    ).toEqual(['r1', 'r2']);
  });
});

describe('shouldMarkRoomNotCleaned', () => {
  it('marks unset and cleaned only', () => {
    expect(shouldMarkRoomNotCleaned(undefined)).toBe(true);
    expect(shouldMarkRoomNotCleaned('cleaned')).toBe(true);
    expect(shouldMarkRoomNotCleaned('not_cleaned')).toBe(false);
  });
});

describe('collectRoomIdsToMarkNotCleaned', () => {
  it('filters rooms already not_cleaned', () => {
    expect(
      collectRoomIdsToMarkNotCleaned(
        { rooms: [{ id: 'r1' }, { id: 'r2' }] },
        { r1: 'not_cleaned', r2: 'cleaned' }
      )
    ).toEqual(['r2']);
  });
});
