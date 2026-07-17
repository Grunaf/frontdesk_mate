import type { GuestStayConfig } from '@/entities/tenant/model/guestStay';

import type { GuestStaySizeSnapshot } from '../model/types';

/** Room / bed / floor counts derived from guestStay room map. */
export function deriveGuestStaySize(
  guestStay: GuestStayConfig | undefined | null
): GuestStaySizeSnapshot {
  const roomCount = guestStay?.rooms?.length ?? 0;
  const bedCount = guestStay?.beds?.length ?? 0;
  const floorCount = guestStay?.floors?.length ?? 0;
  const hasMap = roomCount > 0 || bedCount > 0;

  if (!hasMap) {
    return { roomCount: 0, bedCount: 0, floorCount: 0, source: 'empty' };
  }

  return {
    roomCount,
    bedCount,
    floorCount,
    source: 'guestStay',
  };
}
