import 'server-only';

import { findReceptionUserByLogin } from './api/receptionUserRepository';
import { verifyReceptionUserPin } from './lib/receptionUserPin';

export {
  createReceptionUser,
  disableReceptionUser,
  findReceptionUserById,
  findReceptionUserByLogin,
  listReceptionUsersByTenant,
  setReceptionUserPinHash,
  updateReceptionUser,
  updateReceptionUserPermissions,
} from './api/receptionUserRepository';
export {
  RECEPTION_STAFF_PERMISSIONS,
  isReceptionStaffPermission,
  receptionStaffCanManageArchive,
  receptionStaffCanManageTrash,
  receptionStaffHasPermission,
  sanitizeReceptionStaffPermissions,
} from './lib/receptionPermissions';
export type { ReceptionStaffPermission } from './lib/receptionPermissions';
export type {
  CreateReceptionUserInput,
  CreateReceptionUserResult,
  DisableReceptionUserResult,
  ReceptionUserRecord,
  SetReceptionUserPinHashResult,
  UpdateReceptionUserInput,
  UpdateReceptionUserPermissionsInput,
  UpdateReceptionUserPermissionsResult,
  UpdateReceptionUserResult,
} from './model/types';

export type VerifyReceptionStaffLoginResult =
  | { ok: true; receptionUserId: string }
  | { ok: false; error: 'invalid_credentials' | 'user_disabled' };

export async function verifyReceptionStaffLogin(
  tenantSlug: string,
  login: string,
  pin: string
): Promise<VerifyReceptionStaffLoginResult> {
  const user = await findReceptionUserByLogin(tenantSlug, login);
  if (!user) {
    return { ok: false, error: 'invalid_credentials' };
  }

  if (user.disabled_at) {
    return { ok: false, error: 'user_disabled' };
  }

  if (!verifyReceptionUserPin(tenantSlug, user.id, pin, user.pin_hash)) {
    return { ok: false, error: 'invalid_credentials' };
  }

  return { ok: true, receptionUserId: user.id };
}
