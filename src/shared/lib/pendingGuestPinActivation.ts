const STORAGE_KEY = 'fdm_pending_pin_activation';

export interface PendingGuestPinActivation {
  tenantSlug: string;
  pin: string;
  queuedAt: number;
}

export function readPendingGuestPinActivation(tenantSlug: string): PendingGuestPinActivation | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingGuestPinActivation;
    if (
      !parsed?.tenantSlug ||
      !parsed?.pin ||
      parsed.tenantSlug !== tenantSlug ||
      !/^\d{6}$/.test(parsed.pin)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writePendingGuestPinActivation(activation: PendingGuestPinActivation): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activation));
}

export function clearPendingGuestPinActivation(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
