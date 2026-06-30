export function buildNightAccessDismissStorageKey(tenantSlug: string, stayId: string): string {
  return `stayEssentialsNightDismissed:${tenantSlug}:${stayId}`;
}

export function readNightAccessDismissed(tenantSlug: string, stayId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(buildNightAccessDismissStorageKey(tenantSlug, stayId)) === '1';
  } catch {
    return false;
  }
}

export function persistNightAccessDismissed(tenantSlug: string, stayId: string): void {
  try {
    window.localStorage.setItem(buildNightAccessDismissStorageKey(tenantSlug, stayId), '1');
  } catch {
    // ignore storage failures
  }
}
