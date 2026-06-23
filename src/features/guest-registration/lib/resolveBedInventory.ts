import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';

export type BedInventoryStatus = 'free' | 'occupied';

export interface BedInventoryEntry {
  bedId: string;
  status: BedInventoryStatus;
  stay?: GuestStayRecordWithLink;
}

export interface BedInventorySnapshot {
  beds: BedInventoryEntry[];
  orphanStays: GuestStayRecordWithLink[];
}

export function resolveBedInventory(
  settings: TenantSettings,
  stays: GuestStayRecordWithLink[]
): BedInventorySnapshot {
  const bedIds = listGuestStayBedIds(settings);
  const activeStays = stays.filter((stay) => !stay.revoked_at);
  const stayByBedId = new Map<string, GuestStayRecordWithLink>();

  for (const stay of activeStays) {
    stayByBedId.set(stay.bed_id, stay);
  }

  const configuredBedIds = new Set(bedIds);
  const beds: BedInventoryEntry[] = bedIds.map((bedId) => {
    const stay = stayByBedId.get(bedId);
    if (stay) {
      return { bedId, status: 'occupied', stay };
    }
    return { bedId, status: 'free' };
  });

  const orphanStays = activeStays.filter((stay) => !configuredBedIds.has(stay.bed_id));

  return { beds, orphanStays };
}
