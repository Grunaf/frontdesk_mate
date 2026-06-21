export type AdminTenantMode = 'launch' | 'advanced';

const MODE_PREFIX = 'admin-tenant-mode:';

export function getAdminTenantModeStorageKey(slug: string): string {
  return `${MODE_PREFIX}${slug || 'new'}`;
}

export function readStoredAdminTenantMode(slug: string): AdminTenantMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(getAdminTenantModeStorageKey(slug));
  return value === 'launch' || value === 'advanced' ? value : null;
}

export function writeStoredAdminTenantMode(slug: string, mode: AdminTenantMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getAdminTenantModeStorageKey(slug), mode);
}

export function resolveDefaultAdminTenantMode(input: {
  isNewTenant: boolean;
  guestPathReady: boolean;
  storedMode: AdminTenantMode | null;
}): AdminTenantMode {
  if (input.storedMode) {
    return input.storedMode;
  }

  if (input.isNewTenant) {
    return 'launch';
  }

  return input.guestPathReady ? 'advanced' : 'launch';
}

export function readAdminModeFromSearchParams(
  searchParams: URLSearchParams | null
): AdminTenantMode | null {
  const value = searchParams?.get('mode');
  return value === 'launch' || value === 'advanced' ? value : null;
}
