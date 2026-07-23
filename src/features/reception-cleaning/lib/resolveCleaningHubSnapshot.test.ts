import { describe, expect, it } from 'vitest';

import { resolveCleaningHubSnapshot } from './resolveCleaningHubSnapshot';

const rooms = [
  {
    roomId: 'r1',
    roomLabel: 'Dorm A',
    beds: [
      { bedId: 'b1', displayLabel: 'A1' },
      { bedId: 'b2', displayLabel: 'A2' },
      { bedId: 'b3', displayLabel: 'A3' },
    ],
  },
  {
    roomId: 'r2',
    roomLabel: 'Dorm B',
    beds: [
      { bedId: 'b4', displayLabel: 'B1' },
      { bedId: 'b5', displayLabel: 'B2' },
    ],
  },
] as const;

describe('resolveCleaningHubSnapshot', () => {
  it('counts strip (unset+needs_strip), make (stripped), and done (ready)', () => {
    const snapshot = resolveCleaningHubSnapshot(rooms, {
      b1: 'needs_strip',
      b2: 'stripped',
      b3: 'ready',
      // b4 unset → strip
      b5: 'ready',
    });

    expect(snapshot.stripCount).toBe(2);
    expect(snapshot.makeCount).toBe(1);
    expect(snapshot.doneCount).toBe(2);
  });

  it('puts strip+make in todo and ready in done; drops empty rooms', () => {
    const snapshot = resolveCleaningHubSnapshot(
      rooms,
      {
        b1: 'needs_strip',
        b2: 'ready',
        b3: 'ready',
        b4: 'ready',
        b5: 'ready',
      },
      { r1: 'not_cleaned', r2: 'cleaned' }
    );

    expect(snapshot.todoRooms).toEqual([
      {
        roomId: 'r1',
        roomLabel: 'Dorm A',
        roomStatus: 'not_cleaned',
        beds: [{ bedId: 'b1', displayLabel: 'A1', status: 'needs_strip' }],
      },
    ]);
    expect(snapshot.doneRooms.map((room) => room.roomId)).toEqual(['r1', 'r2']);
    expect(snapshot.doneRooms[0]?.beds.map((bed) => bed.bedId)).toEqual(['b2', 'b3']);
    expect(snapshot.doneRooms[1]?.beds.map((bed) => bed.bedId)).toEqual(['b4', 'b5']);
  });

  it('treats all-unset inventory as strip-only todo', () => {
    const snapshot = resolveCleaningHubSnapshot(rooms, {});
    expect(snapshot.stripCount).toBe(5);
    expect(snapshot.makeCount).toBe(0);
    expect(snapshot.doneCount).toBe(0);
    expect(snapshot.todoRooms).toHaveLength(2);
    expect(snapshot.doneRooms).toHaveLength(0);
  });
});
