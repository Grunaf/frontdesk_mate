import type { TenantSettings } from '@/entities/tenant/model/settings';

export function bedExistsInGuestStay(settings: TenantSettings, bedId: string): boolean {
  const beds = settings.guestStay?.beds ?? [];
  return beds.some(
    (bed) => bed.id === bedId || bed.topId === bedId || bed.bottomId === bedId
  );
}

export function listGuestStayBedIds(settings: TenantSettings): string[] {
  const beds = settings.guestStay?.beds ?? [];
  const ids = new Set<string>();

  for (const bed of beds) {
    if (bed.id?.trim()) ids.add(bed.id.trim());
    if (bed.topId?.trim()) ids.add(bed.topId.trim());
    if (bed.bottomId?.trim()) ids.add(bed.bottomId.trim());
  }

  return [...ids].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
