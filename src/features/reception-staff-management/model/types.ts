import type { ReceptionStaffPermission } from '@/entities/reception-user';

export type ReceptionStaffSurface = 'platform' | 'owner';

/** Public staff row — never includes PIN or pin_hash. */
export type ReceptionStaffUser = {
  id: string;
  login: string;
  displayName: string;
  permissions: ReceptionStaffPermission[];
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReceptionStaffListResult =
  | { ok: true; users: ReceptionStaffUser[] }
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'tenant_not_found' };

export type ReceptionStaffCreateFieldErrors = {
  login?: 'required' | 'invalid';
  displayName?: 'required';
  pin?: 'required' | 'too_short';
};

export type ReceptionStaffPinFieldErrors = {
  pin?: 'required' | 'too_short';
};

export type ReceptionStaffMutateError =
  | 'unauthorized'
  | 'forbidden'
  | 'tenant_not_found'
  | 'db_unavailable'
  | 'invalid_login'
  | 'invalid_display_name'
  | 'invalid_pin'
  | 'login_taken'
  | 'user_not_found'
  | 'user_disabled'
  | 'already_disabled'
  | 'active_limit'
  | 'validation';

export type ReceptionStaffMutateResult =
  | { ok: true; user: ReceptionStaffUser }
  | { ok: false; error: ReceptionStaffMutateError };
