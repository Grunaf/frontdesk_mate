import { describe, expect, it } from 'vitest';
import { resolveOccupiedCleaningBedIds } from './resolveOccupiedCleaningBedIds';

const midStay = {
  bed_id: 'b1',
  guest_name: 'Ada',
  check_in_at: '2026-07-22T14:00:00.000Z',
  check_out_at: '2026-07-25T10:00:00.000Z',
  check_in_date: '2026-07-22',
  check_out_date: '2026-07-25',
  desk_checked_in_at: '2026-07-22T15:00:00.000Z',
};

describe('resolveOccupiedCleaningBedIds', () => {
  it('includes admitted beds covering the night', () => {
    expect([...resolveOccupiedCleaningBedIds([midStay], '2026-07-23')]).toEqual(['b1']);
    expect([...resolveOccupiedCleaningBedIds([midStay], '2026-07-24')]).toEqual(['b1']);
  });

  it('excludes checkout day (exclusive end) so bed can enter cleaning', () => {
    expect([...resolveOccupiedCleaningBedIds([midStay], '2026-07-25')]).toEqual([]);
  });

  it('skips not admitted, revoked, and archived', () => {
    expect(
      [
        ...resolveOccupiedCleaningBedIds(
          [{ ...midStay, passport_checked_at: null, desk_checked_in_at: null }],
          '2026-07-23'
        ),
      ]
    ).toEqual([]);
    expect(
      [...resolveOccupiedCleaningBedIds([{ ...midStay, revoked_at: '2026-07-23T12:00:00.000Z' }], '2026-07-23')]
    ).toEqual([]);
    expect(
      [...resolveOccupiedCleaningBedIds([{ ...midStay, is_archived: true }], '2026-07-23')]
    ).toEqual([]);
  });
});
