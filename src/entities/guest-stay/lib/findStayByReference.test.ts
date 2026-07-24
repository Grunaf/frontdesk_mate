import { describe, expect, it } from 'vitest';
import {
  findStayByBookingQuery,
  findStayByReference,
  listStaysByBookingQuery,
  normalizeStayReferenceQuery,
} from './findStayByReference';

const stays = [
  {
    id: '00000000-0000-0000-0000-0000123456',
    bed_id: '12',
    guest_name: 'Anna Smith',
    check_in_at: '2026-07-08T14:00:00.000Z',
  },
  {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeffffaaaa',
    bed_id: '3',
    guest_name: 'Bob Jones',
    check_in_at: '2026-07-09T14:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-0000123999',
    bed_id: '4',
    guest_name: 'Annabel',
    check_in_at: '2026-07-10T14:00:00.000Z',
  },
];

describe('normalizeStayReferenceQuery', () => {
  it('strips hash and whitespace', () => {
    expect(normalizeStayReferenceQuery(' #123456 ')).toBe('123456');
  });
});

describe('listStaysByBookingQuery', () => {
  it('lists all name matches best-first by check-in', () => {
    expect(listStaysByBookingQuery(stays, 'ann').map((stay) => stay.guest_name)).toEqual([
      'Anna Smith',
      'Annabel',
    ]);
  });

  it('lists partial ref matches', () => {
    expect(listStaysByBookingQuery(stays, '123').map((stay) => stay.bed_id)).toEqual([
      '12',
      '4',
    ]);
  });

  it('respects result limit', () => {
    expect(listStaysByBookingQuery(stays, 'a', 1)).toHaveLength(1);
  });

  it('returns empty for blank or miss', () => {
    expect(listStaysByBookingQuery(stays, '   ')).toEqual([]);
    expect(listStaysByBookingQuery(stays, 'ZZZZZZ')).toEqual([]);
  });
});

describe('findStayByBookingQuery', () => {
  it('finds stay by exact ref', () => {
    expect(findStayByBookingQuery(stays, '#123456')?.bed_id).toBe('12');
  });

  it('finds stay by partial guest name (case-insensitive)', () => {
    expect(findStayByBookingQuery(stays, 'bob')?.guest_name).toBe('Bob Jones');
  });

  it('prefers exact ref over name contains', () => {
    const withClash = [
      ...stays,
      {
        id: '00000000-0000-0000-0000-0000bbbbbb',
        bed_id: '9',
        guest_name: 'Guest 123456',
        check_in_at: '2026-07-01T14:00:00.000Z',
      },
    ];
    expect(findStayByBookingQuery(withClash, '123456')?.bed_id).toBe('12');
  });
});

describe('findStayByReference', () => {
  it('delegates to booking query (backward compatible)', () => {
    expect(findStayByReference(stays, '#123456')?.bed_id).toBe('12');
  });
});
