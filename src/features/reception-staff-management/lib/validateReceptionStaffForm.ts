import { isReceptionLoginValid } from '@/entities/reception-user';
import { RECEPTION_USER_PIN_MIN_LENGTH } from '@/entities/reception-user';

import type {
  ReceptionStaffCreateFieldErrors,
  ReceptionStaffPinFieldErrors,
  ReceptionStaffUser,
} from '../model/types';

export const MAX_ACTIVE_RECEPTION_STAFF = 20;

export function countActiveReceptionStaff(users: ReceptionStaffUser[]): number {
  return users.filter((user) => !user.disabledAt).length;
}

export function isActiveReceptionStaffLimitReached(users: ReceptionStaffUser[]): boolean {
  return countActiveReceptionStaff(users) >= MAX_ACTIVE_RECEPTION_STAFF;
}

export function validateReceptionStaffCreateDraft(input: {
  login: string;
  displayName: string;
  pin: string;
}): { ok: true } | { ok: false; fieldErrors: ReceptionStaffCreateFieldErrors } {
  const fieldErrors: ReceptionStaffCreateFieldErrors = {};

  const login = input.login.trim();
  if (!login) {
    fieldErrors.login = 'required';
  } else if (!isReceptionLoginValid(login)) {
    fieldErrors.login = 'invalid';
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    fieldErrors.displayName = 'required';
  }

  const pin = input.pin.trim();
  if (!pin) {
    fieldErrors.pin = 'required';
  } else if (pin.length < RECEPTION_USER_PIN_MIN_LENGTH) {
    fieldErrors.pin = 'too_short';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true };
}

export function validateReceptionStaffPinDraft(pin: string):
  | { ok: true }
  | { ok: false; fieldErrors: ReceptionStaffPinFieldErrors } {
  const trimmed = pin.trim();
  if (!trimmed) {
    return { ok: false, fieldErrors: { pin: 'required' } };
  }
  if (trimmed.length < RECEPTION_USER_PIN_MIN_LENGTH) {
    return { ok: false, fieldErrors: { pin: 'too_short' } };
  }
  return { ok: true };
}
