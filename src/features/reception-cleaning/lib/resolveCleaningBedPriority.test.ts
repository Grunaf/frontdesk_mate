import { describe, expect, it } from 'vitest';

import {
  compareCleaningBedBookingPriority,
  resolveCleaningArrivalHint,
  resolveCleaningBedBookingPriority,
  resolveNextCheckInByBedId,
  sortCleaningTodoRoomsByBookingPriority,
} from './resolveCleaningBedPriority';

describe('resolveNextCheckInByBedId', () => {
  it('picks earliest check-in on/after operational day per bed', () => {
    expect(
      resolveNextCheckInByBedId(
        [
          {
            bed_id: 'b1',
            check_in_at: '2026-07-20T14:00:00.000Z',
            check_in_date: '2026-07-20',
          },
          {
            bed_id: 'b1',
            check_in_at: '2026-07-25T14:00:00.000Z',
            check_in_date: '2026-07-25',
          },
          {
            bed_id: 'b1',
            check_in_at: '2026-07-26T14:00:00.000Z',
            check_in_date: '2026-07-26',
          },
          {
            bed_id: 'b2',
            check_in_at: '2026-07-25T14:00:00.000Z',
            check_in_date: '2026-07-25',
          },
        ],
        '2026-07-25'
      )
    ).toEqual({ b1: '2026-07-25', b2: '2026-07-25' });
  });

  it('skips archived and revoked stays', () => {
    expect(
      resolveNextCheckInByBedId(
        [
          {
            bed_id: 'b1',
            check_in_at: '2026-07-25T14:00:00.000Z',
            check_in_date: '2026-07-25',
            is_archived: true,
          },
          {
            bed_id: 'b1',
            check_in_at: '2026-07-26T14:00:00.000Z',
            check_in_date: '2026-07-26',
            revoked_at: '2026-07-24T10:00:00.000Z',
          },
        ],
        '2026-07-25'
      )
    ).toEqual({});
  });
});

describe('resolveCleaningBedBookingPriority', () => {
  it('maps today / tomorrow / other', () => {
    expect(resolveCleaningBedBookingPriority('2026-07-25', '2026-07-25')).toBe(0);
    expect(resolveCleaningBedBookingPriority('2026-07-26', '2026-07-25')).toBe(1);
    expect(resolveCleaningBedBookingPriority('2026-07-28', '2026-07-25')).toBe(2);
    expect(resolveCleaningBedBookingPriority(undefined, '2026-07-25')).toBe(2);
  });
});

describe('resolveCleaningArrivalHint', () => {
  it('returns Today / Tomorrow only for near arrivals', () => {
    expect(resolveCleaningArrivalHint('2026-07-25', '2026-07-25')).toBe('Today');
    expect(resolveCleaningArrivalHint('2026-07-26', '2026-07-25')).toBe('Tomorrow');
    expect(resolveCleaningArrivalHint('2026-07-28', '2026-07-25')).toBeNull();
    expect(resolveCleaningArrivalHint(undefined, '2026-07-25')).toBeNull();
  });
});

describe('compareCleaningBedBookingPriority', () => {
  it('orders today before tomorrow before none', () => {
    expect(
      compareCleaningBedBookingPriority('2026-07-25', '2026-07-26', '2026-07-25')
    ).toBeLessThan(0);
    expect(
      compareCleaningBedBookingPriority('2026-07-26', undefined, '2026-07-25')
    ).toBeLessThan(0);
  });
});

describe('sortCleaningTodoRoomsByBookingPriority', () => {
  it('floats rooms with today arrivals and sorts beds inside', () => {
    const sorted = sortCleaningTodoRoomsByBookingPriority(
      [
        {
          roomId: 'r-late',
          beds: [
            { bedId: 'b-none', displayLabel: 'Z1' },
            { bedId: 'b-tomorrow', displayLabel: 'A1' },
          ],
        },
        {
          roomId: 'r-today',
          beds: [
            { bedId: 'b-today', displayLabel: 'B1' },
            { bedId: 'b-free', displayLabel: 'B2' },
          ],
        },
      ],
      {
        'b-today': '2026-07-25',
        'b-tomorrow': '2026-07-26',
      },
      '2026-07-25'
    );

    expect(sorted.map((room) => room.roomId)).toEqual(['r-today', 'r-late']);
    expect(sorted[0]?.beds.map((bed) => bed.bedId)).toEqual(['b-today', 'b-free']);
    expect(sorted[1]?.beds.map((bed) => bed.bedId)).toEqual(['b-tomorrow', 'b-none']);
  });
});
