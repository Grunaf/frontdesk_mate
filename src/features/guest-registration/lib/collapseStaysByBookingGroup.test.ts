import { describe, expect, it } from 'vitest';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import {
  collapseStaysByBookingGroup,
  countBookingGroupMembers,
} from './collapseStaysByBookingGroup';

describe('collapseStaysByBookingGroup', () => {
  it('keeps singletons and collapses party to balance lead', () => {
    const solo = makeGuestStayRecordFixture({ id: 'solo', guest_name: 'Solo' });
    const sibling = makeGuestStayRecordFixture({
      id: 'sib',
      guest_name: 'Maria 2',
      booking_group_id: 'g1',
      booking_amount_due_minor: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    const lead = makeGuestStayRecordFixture({
      id: 'lead',
      guest_name: 'Maria',
      booking_group_id: 'g1',
      booking_amount_due_minor: 8000,
      created_at: '2026-01-01T00:00:01.000Z',
    });

    expect(collapseStaysByBookingGroup([sibling, solo, lead]).map((s) => s.id)).toEqual([
      'lead',
      'solo',
    ]);
  });

  it('counts group members', () => {
    const stays = [
      makeGuestStayRecordFixture({ id: 'a', booking_group_id: 'g1' }),
      makeGuestStayRecordFixture({ id: 'b', booking_group_id: 'g1' }),
      makeGuestStayRecordFixture({ id: 'c', booking_group_id: null }),
    ];
    expect(countBookingGroupMembers(stays, 'g1')).toBe(2);
    expect(countBookingGroupMembers(stays, null)).toBe(1);
  });
});
