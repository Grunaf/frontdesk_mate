import { describe, expect, it } from 'vitest';

import { resolveArchiveSplitPlan } from './resolveArchiveSplitPlan';

describe('resolveArchiveSplitPlan', () => {
  it('A: cancel always full-archives', () => {
    expect(
      resolveArchiveSplitPlan({
        intent: 'cancel',
        admitted: false,
        checkInDate: '2026-07-20',
        checkOutDate: '2026-07-25',
        operationalDate: '2026-07-22',
      })
    ).toEqual({ kind: 'full' });
  });

  it('B: checkout mid-stay after admit → remainder', () => {
    expect(
      resolveArchiveSplitPlan({
        intent: 'checkout',
        admitted: true,
        checkInDate: '2026-07-20',
        checkOutDate: '2026-07-25',
        operationalDate: '2026-07-22',
      })
    ).toEqual({
      kind: 'remainder',
      livedCheckOutDate: '2026-07-22',
      remainderCheckInDate: '2026-07-22',
      remainderCheckOutDate: '2026-07-25',
    });
  });

  it('checkout on check-in day → full (no lived nights yet)', () => {
    expect(
      resolveArchiveSplitPlan({
        intent: 'checkout',
        admitted: true,
        checkInDate: '2026-07-20',
        checkOutDate: '2026-07-25',
        operationalDate: '2026-07-20',
      })
    ).toEqual({ kind: 'full' });
  });

  it('checkout on/after planned check-out → full (no remainder)', () => {
    expect(
      resolveArchiveSplitPlan({
        intent: 'checkout',
        admitted: true,
        checkInDate: '2026-07-20',
        checkOutDate: '2026-07-25',
        operationalDate: '2026-07-25',
      })
    ).toEqual({ kind: 'full' });
  });

  it('checkout without admit → full', () => {
    expect(
      resolveArchiveSplitPlan({
        intent: 'checkout',
        admitted: false,
        checkInDate: '2026-07-20',
        checkOutDate: '2026-07-25',
        operationalDate: '2026-07-22',
      })
    ).toEqual({ kind: 'full' });
  });
});
