import { describe, expect, it } from 'vitest';

import {
  isPastEditEligibleArchivedStay,
  shouldUnarchiveAfterPastOccupancyEdit,
} from './resolvePastStayOccupancyEdit';

describe('isPastEditEligibleArchivedStay', () => {
  it('allows full checked-out archives only (status is irrelevant)', () => {
    expect(
      isPastEditEligibleArchivedStay({
        is_archived: true,
        archive_kind: 'full',
        archive_reason: 'checked_out',
      })
    ).toBe(true);
  });

  it('rejects live, cancelled, and remainder archives', () => {
    expect(
      isPastEditEligibleArchivedStay({
        is_archived: false,
        archive_kind: 'full',
        archive_reason: 'checked_out',
      })
    ).toBe(false);
    expect(
      isPastEditEligibleArchivedStay({
        is_archived: true,
        archive_kind: 'full',
        archive_reason: 'cancelled',
      })
    ).toBe(false);
    expect(
      isPastEditEligibleArchivedStay({
        is_archived: true,
        archive_kind: 'remainder',
        archive_reason: 'checked_out',
      })
    ).toBe(false);
  });
});

describe('shouldUnarchiveAfterPastOccupancyEdit', () => {
  it('unarchives when new checkout is still after operational day', () => {
    expect(
      shouldUnarchiveAfterPastOccupancyEdit({
        checkOutDate: '2026-07-28',
        operationalDate: '2026-07-26',
      })
    ).toBe(true);
  });

  it('keeps archived when checkout day is today or earlier', () => {
    expect(
      shouldUnarchiveAfterPastOccupancyEdit({
        checkOutDate: '2026-07-26',
        operationalDate: '2026-07-26',
      })
    ).toBe(false);
    expect(
      shouldUnarchiveAfterPastOccupancyEdit({
        checkOutDate: '2026-07-25',
        operationalDate: '2026-07-26',
      })
    ).toBe(false);
  });
});
