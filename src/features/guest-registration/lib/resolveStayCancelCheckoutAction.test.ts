import { describe, expect, it } from 'vitest';

import { resolveStayCancelCheckoutAction } from './resolveStayCancelCheckoutAction';

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

  it('hides checkout when exclusive end is today or earlier (lived shortened stay)', () => {
    expect(
      resolveStayCancelCheckoutAction({
        ...base,
        passport_checked_at: '2026-07-20T12:00:00.000Z',
        check_out_date: '2026-07-21',
        operationalDate: '2026-07-21',
      })
    ).toBeNull();
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
});
