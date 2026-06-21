export type PinActivationErrorKey = 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable';

export function shouldQueuePinActivationError(error: string): boolean {
  return error === 'db_unavailable';
}

export function normalizePinActivationError(error: string): PinActivationErrorKey {
  if (error === 'expired' || error === 'revoked' || error === 'db_unavailable') {
    return error;
  }

  return 'invalid_pin';
}
