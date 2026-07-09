import { describe, expect, it } from 'vitest';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  addNights,
  classifyIssuedAccessSection,
  countAccessNights,
  defaultWalkInDates,
  filterIssuedAccess,
  formatAccessNightsLabel,
  formatAccessPeriodSummary,
  groupIssuedAccess,
  isValidAccessRange,
} from './guestAccessDates';

const now = new Date('2026-06-22T12:00:00.000Z');

function makeStay(overrides: Partial<GuestStayRecordWithLink> = {}): GuestStayRecordWithLink {
  return {
    id: 'stay-1',
    tenant_id: 'tenant-1',
    tenant_slug: 'demo',
    bed_id: 'bed-1',
    guest_name: 'Alex',
    check_in_at: '2026-06-22T14:00:00.000Z',
    check_out_at: '2026-06-25T23:59:59.999Z',
    activated_at: null,
    desk_checked_in_at: null,
    key_issued_at: null,
    passport_checked_at: null,
    tax_collected_at: null,
    revoked_at: null,
    created_at: '2026-06-22T10:00:00.000Z',
    magicLinkUrl: 'https://example.com/check-in',
    ...overrides,
  };
}

describe('guestAccessDates', () => {
  it('counts nights between valid from and until', () => {
    expect(countAccessNights('2026-06-22', '2026-06-23')).toBe(1);
    expect(countAccessNights('2026-06-22', '2026-06-25')).toBe(3);
    expect(countAccessNights('2026-06-22', '2026-06-22')).toBe(0);
  });

  it('rejects invalid ranges', () => {
    expect(isValidAccessRange('2026-06-25', '2026-06-22')).toBe(false);
    expect(countAccessNights('2026-06-25', '2026-06-22')).toBe(0);
  });

  it('adds nights from a start date', () => {
    expect(addNights('2026-06-22', 1)).toBe('2026-06-23');
    expect(addNights('2026-06-22', 7)).toBe('2026-06-29');
  });

  it('formats night labels', () => {
    expect(formatAccessNightsLabel(1)).toBe('1 night');
    expect(formatAccessNightsLabel(3)).toBe('3 nights');
  });

  it('defaults walk-in to today and tomorrow', () => {
    expect(defaultWalkInDates(now)).toEqual({
      checkInDate: '2026-06-22',
      checkOutDate: '2026-06-23',
    });
  });

  it('summarizes tonight walk-in access', () => {
    expect(formatAccessPeriodSummary('2026-06-22', '2026-06-23', now)).toBe(
      'Tonight · 1 night (Jun 22 → Jun 23)'
    );
  });

  it('summarizes custom access periods', () => {
    expect(formatAccessPeriodSummary('2026-06-28', '2026-06-30', now)).toBe(
      'Jun 28 → Jun 30 · 2 nights'
    );
  });
});

describe('groupIssuedAccess', () => {
  it('groups stays into sections', () => {
    const grouped = groupIssuedAccess(
      [
        makeStay({
          id: 'in-app',
          check_in_at: '2026-06-20T14:00:00.000Z',
          activated_at: '2026-06-20T15:00:00.000Z',
        }),
        makeStay({
          id: 'arriving',
          check_in_at: '2026-06-22T14:00:00.000Z',
          activated_at: null,
        }),
        makeStay({
          id: 'scheduled',
          check_in_at: '2026-06-28T14:00:00.000Z',
          check_out_at: '2026-06-30T23:59:59.999Z',
        }),
      ],
      now
    );

    expect(grouped.inApp.map((stay) => stay.id)).toEqual(['in-app']);
    expect(grouped.arrivingToday.map((stay) => stay.id)).toEqual(['arriving']);
    expect(grouped.scheduled.map((stay) => stay.id)).toEqual(['scheduled']);
  });

  it('classifies valid_unused before today as other active', () => {
    expect(
      classifyIssuedAccessSection(
        makeStay({
          check_in_at: '2026-06-20T14:00:00.000Z',
          check_out_at: '2026-06-25T23:59:59.999Z',
          activated_at: null,
        }),
        now
      )
    ).toBe('other_active');
  });
});

describe('filterIssuedAccess', () => {
  it('filters today and this week', () => {
    const stays = [
      makeStay({ id: 'today' }),
      makeStay({
        id: 'future',
        check_in_at: '2026-07-01T14:00:00.000Z',
        check_out_at: '2026-07-05T23:59:59.999Z',
      }),
    ];

    expect(filterIssuedAccess(stays, 'today', now).map((stay) => stay.id)).toEqual(['today']);
    expect(filterIssuedAccess(stays, 'this_week', now).map((stay) => stay.id)).toEqual(['today']);
    expect(filterIssuedAccess(stays, 'all', now)).toHaveLength(2);
  });
});
