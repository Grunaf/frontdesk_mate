export type PinActivationErrorKey =
  | 'invalid_pin'
  | 'expired'
  | 'revoked'
  | 'db_unavailable'
  | 'too_many_attempts';

export function shouldQueuePinActivationError(error: string): boolean {
  return error === 'db_unavailable';
}

export function normalizePinActivationError(error: string): PinActivationErrorKey {
  if (
    error === 'expired' ||
    error === 'revoked' ||
    error === 'db_unavailable' ||
    error === 'too_many_attempts'
  ) {
    return error;
  }

  return 'invalid_pin';
}
