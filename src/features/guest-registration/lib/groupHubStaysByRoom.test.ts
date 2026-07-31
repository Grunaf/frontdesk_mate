import { describe, expect, it } from 'vitest';

import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';

import { groupHubStaysByRoom, HUB_UNASSIGNED_ROOM_ID } from './groupHubStaysByRoom';

describe('groupHubStaysByRoom', () => {
  const rooms = [
    { roomId: 'r1', roomLabel: 'Dorm A', bedIds: ['a1', 'a2'] },
    { roomId: 'r2', roomLabel: 'Dorm B', bedIds: ['b1'] },
  ];

  it('groups stays by inventory room order and omits empty rooms', () => {
    const stays = [
      makeGuestStayRecordFixture({ id: 's-b', bed_id: 'b1' }),
      makeGuestStayRecordFixture({ id: 's-a2', bed_id: 'a2' }),
      makeGuestStayRecordFixture({ id: 's-a1', bed_id: 'a1' }),
    ];

    expect(groupHubStaysByRoom({ stays, rooms })).toEqual([
      {
        roomId: 'r1',
        roomLabel: 'Dorm A',
        stays: [stays[1], stays[2]],
      },
      {
        roomId: 'r2',
        roomLabel: 'Dorm B',
        stays: [stays[0]],
      },
    ]);
  });

  it('puts unknown beds in Unassigned at the end', () => {
    const stays = [
      makeGuestStayRecordFixture({ id: 'orphan', bed_id: 'ghost' }),
      makeGuestStayRecordFixture({ id: 'ok', bed_id: 'a1' }),
    ];

    const groups = groupHubStaysByRoom({ stays, rooms });
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ roomId: 'r1', stays: [stays[1]] });
    expect(groups[1]).toMatchObject({
      roomId: HUB_UNASSIGNED_ROOM_ID,
      roomLabel: 'Unassigned',
      stays: [stays[0]],
    });
  });

  it('returns empty when no stays', () => {
    expect(groupHubStaysByRoom({ stays: [], rooms })).toEqual([]);
  });
});
