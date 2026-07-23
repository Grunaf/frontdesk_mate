import type { ReceptionStaffPermission } from '../lib/receptionPermissions';

export type ReceptionUserRecord = {
  id: string;
  tenant_id: string;
  login: string;
  display_name: string;
  pin_hash: string;
  permissions: ReceptionStaffPermission[];
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateReceptionUserInput = {
  tenantSlug: string;
  login: string;
  displayName: string;
  pin: string;
  permissions?: ReceptionStaffPermission[];
};

export type CreateReceptionUserResult =
  | { ok: true; user: ReceptionUserRecord }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'db_unavailable'
        | 'invalid_login'
        | 'invalid_display_name'
        | 'invalid_pin'
        | 'login_taken';
    };

export type UpdateReceptionUserInput = {
  tenantSlug: string;
  userId: string;
  displayName?: string;
  pin?: string;
  permissions?: ReceptionStaffPermission[];
};

export type UpdateReceptionUserPermissionsInput = {
  tenantSlug: string;
  userId: string;
  permissions: ReceptionStaffPermission[];
};

export type UpdateReceptionUserPermissionsResult =
  | { ok: true; user: ReceptionUserRecord }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'db_unavailable'
        | 'user_not_found'
        | 'user_disabled'
        | 'invalid_permissions';
    };

export type UpdateReceptionUserResult =
  | { ok: true; user: ReceptionUserRecord }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'db_unavailable'
        | 'user_not_found'
        | 'invalid_display_name'
        | 'invalid_pin'
        | 'user_disabled';
    };

export type DisableReceptionUserResult =
  | { ok: true; user: ReceptionUserRecord }
  | {
      ok: false;
      error: 'tenant_not_found' | 'db_unavailable' | 'user_not_found' | 'already_disabled';
    };

export type SetReceptionUserPinHashResult =
  | { ok: true; user: ReceptionUserRecord }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'db_unavailable'
        | 'user_not_found'
        | 'invalid_pin'
        | 'user_disabled';
    };
