export type ArchiveSplitPlan =
  | { kind: 'full' }
  | {
      kind: 'remainder';
      /** Exclusive end for the lived original. */
      livedCheckOutDate: string;
      remainderCheckInDate: string;
      remainderCheckOutDate: string;
    };

/**
 * Decide whether Cancel/Checkout archives the whole booking or splits a remainder.
 * Cancel always full-archives. Checkout splits only when admitted and operational day
 * falls strictly inside stay nights [checkIn, checkOut).
 */
export function resolveArchiveSplitPlan(input: {
  intent: 'cancel' | 'checkout';
  admitted: boolean;
  checkInDate: string;
  checkOutDate: string;
  operationalDate: string;
}): ArchiveSplitPlan {
  const { intent, admitted, checkInDate, checkOutDate, operationalDate } = input;

  if (intent === 'cancel') {
    return { kind: 'full' };
  }

  if (
    admitted &&
    operationalDate > checkInDate &&
    operationalDate < checkOutDate
  ) {
    return {
      kind: 'remainder',
      livedCheckOutDate: operationalDate,
      remainderCheckInDate: operationalDate,
      remainderCheckOutDate: checkOutDate,
    };
  }

  return { kind: 'full' };
}
