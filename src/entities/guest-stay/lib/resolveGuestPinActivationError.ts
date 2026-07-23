export type GuestPinActivationError = 'invalid_pin' | 'expired' | 'revoked';

export interface GuestPinStaySnapshot {
  revoked_at: string | null;
  check_out_at: string;
  is_archived?: boolean;
  /** @deprecated use is_archived */
  is_deleted?: boolean;
}

export function resolveGuestPinActivationError(
  stay: GuestPinStaySnapshot | null
): GuestPinActivationError | null {
  if (!stay) {
    return 'invalid_pin';
  }

  if (stay.revoked_at || stay.is_archived || stay.is_deleted) {
    return 'revoked';
  }

  if (new Date(stay.check_out_at).getTime() <= Date.now()) {
    return 'expired';
  }

  return null;
}
