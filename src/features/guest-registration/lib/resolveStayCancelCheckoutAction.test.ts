import { describe, expect, it } from 'vitest';

import {
  isStayCheckoutOverdue,
  resolveStayCancelCheckoutAction,
} from './resolveStayCancelCheckoutAction';

describe('resolveStayCancelCheckoutAction', () => {
  const base = {
    check_out_at: '2026-07-27T23:59:59.999Z',
    check_out_date: '2026-07-27',
    operationalDate: '2026-07-21',
  };

  it('offers cancel when not admitted', () => {
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: null,
        desk_checked_in_at: null,
      })
    ).toBe('cancel');
  });

  it('offers checkout when admitted and still before exclusive end', () => {
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: '2026-07-20T12:00:00.000Z',
      })
    ).toBe('checkout');
  });

  it('offers checkout when exclusive end is today or earlier (overdue until archived)', () => {
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: '2026-07-20T12:00:00.000Z',
        check_out_date: '2026-07-21',
        operationalDate: '2026-07-21',
      })
    ).toBe('checkout');
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: '2026-07-20T12:00:00.000Z',
        check_out_date: '2026-07-20',
        operationalDate: '2026-07-21',
      })
    ).toBe('checkout');
  });

  it('hides actions for archived rows', () => {
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: null,
        is_archived: true,
      })
    ).toBeNull();
  });

  it('hides cancel/checkout for volunteer stays', () => {
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: null,
        stay_kind: 'volunteer',
      })
    ).toBeNull();
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: '2026-07-20T12:00:00.000Z',
        stay_kind: 'volunteer',
      })
    ).toBeNull();
  });
});

describe('isStayCheckoutOverdue', () => {
  const base = {
    check_out_at: '2026-07-27T23:59:59.999Z',
    check_out_date: '2026-07-25',
    operationalDate: '2026-07-25',
    passport_checked_at: '2026-07-20T12:00:00.000Z' as string | null,
  };

  it('is true when admitted, not archived, and on/after check-out day', () => {
    expect(isStayCheckoutOverdue(base)).toBe(true);
    expect(isStayCheckoutOverdue({ ...base, operationalDate: '2026-07-26' })).toBe(true);
  });

  it('is false while still before exclusive end', () => {
    expect(isStayCheckoutOverdue({ ...base, operationalDate: '2026-07-24' })).toBe(false);
  });

  it('is false when not admitted, archived, or volunteer', () => {
    expect(isStayCheckoutOverdue({ ...base, passport_checked_at: null })).toBe(false);
    expect(isStayCheckoutOverdue({ ...base, is_archived: true })).toBe(false);
    expect(isStayCheckoutOverdue({ ...base, stay_kind: 'volunteer' })).toBe(false);
  });
});
