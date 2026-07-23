import { describe, expect, it } from 'vitest';

import {
  filterBedsByRoomAvailable,
  listUnavailableVolunteerBedIds,
  listVolunteerBedsByRoom,
} from './volunteerBeds';

describe('listVolunteerBedsByRoom', () => {
  it('groups beds by room with slot display labels', () => {
    const groups = listVolunteerBedsByRoom({
      guestStay: {
        floors: [{ id: 'floor-1', label: '1' }],
        rooms: [
          { id: 'room-a', label: 'Dorm A', floorId: 'floor-1' },
          { id: 'room-b', label: 'Dorm B', floorId: 'floor-1' },
        ],
        beds: [
          { id: 'bed-1', roomId: 'room-a' },
          { id: 'bed-2', roomId: 'room-b' },
        ],
      },
    });

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      roomId: 'room-a',
      roomLabel: 'Dorm A',
      beds: [{ bedId: 'bed-1', displayLabel: '1' }],
    });
    expect(groups[1]?.roomLabel).toBe('Dorm B');
  });
});

describe('filterBedsByRoomAvailable', () => {
  it('drops occupied beds and empty rooms', () => {
    const filtered = filterBedsByRoomAvailable(
      [
        {
          roomId: 'room-a',
          roomLabel: 'Dorm A',
          beds: [
            { bedId: 'bed-1', displayLabel: '1' },
            { bedId: 'bed-2', displayLabel: '2' },
          ],
        },
        {
          roomId: 'room-b',
          roomLabel: 'Dorm B',
          beds: [{ bedId: 'bed-3', displayLabel: '1' }],
        },
      ],
      new Set(['bed-1', 'bed-3'])
    );

    expect(filtered).toEqual([
      {
        roomId: 'room-a',
        roomLabel: 'Dorm A',
        beds: [{ bedId: 'bed-2', displayLabel: '2' }],
      },
    ]);
  });
});

describe('listUnavailableVolunteerBedIds', () => {
  it('marks beds with overlapping plan stays as unavailable', () => {
    const unavailable = listUnavailableVolunteerBedIds({
      bedIds: ['bed-a', 'bed-b'],
      checkInDate: '2026-07-21',
      checkOutDate: '2026-07-25',
      planStays: [
        {
          bed_id: 'bed-a',
          check_in_date: '2026-07-20',
          check_out_date: '2026-07-23',
          is_archived: false,
          revoked_at: null,
        },
        {
          bed_id: 'bed-b',
          check_in_date: '2026-07-25',
          check_out_date: '2026-07-28',
          is_archived: false,
          revoked_at: null,
        },
      ],
    });

    expect(unavailable.has('bed-a')).toBe(true);
    expect(unavailable.has('bed-b')).toBe(false);
  });

  it('ignores archived and revoked stays', () => {
    const unavailable = listUnavailableVolunteerBedIds({
      bedIds: ['bed-a'],
      checkInDate: '2026-07-21',
      checkOutDate: '2026-07-25',
      planStays: [
        {
          bed_id: 'bed-a',
          check_in_date: '2026-07-20',
          check_out_date: '2026-07-23',
          is_archived: true,
          revoked_at: null,
        },
      ],
    });

    expect(unavailable.size).toBe(0);
  });
});
