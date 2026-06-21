import { describe, expect, it } from 'vitest';
import {
  normalizePinActivationError,
  shouldQueuePinActivationError,
} from './pinActivationErrors';

describe('pinActivationErrors', () => {
  it('queues only db_unavailable', () => {
    expect(shouldQueuePinActivationError('db_unavailable')).toBe(true);
    expect(shouldQueuePinActivationError('invalid_pin')).toBe(false);
    expect(shouldQueuePinActivationError('expired')).toBe(false);
    expect(shouldQueuePinActivationError('revoked')).toBe(false);
    expect(shouldQueuePinActivationError('no_tenant')).toBe(false);
  });

  it('maps unknown errors to invalid_pin', () => {
    expect(normalizePinActivationError('no_tenant')).toBe('invalid_pin');
    expect(normalizePinActivationError('wrong_hostel')).toBe('invalid_pin');
    expect(normalizePinActivationError('expired')).toBe('expired');
  });
});
