export { isReceptionLoginValid, normalizeReceptionLogin } from './lib/normalizeReceptionLogin';
export {
  RECEPTION_USER_PIN_MIN_LENGTH,
  isReceptionUserPinValid,
} from './lib/receptionUserPin';
export {
  DESK_CHECK_IN_PERMISSION,
  DESK_CLEANING_PERMISSION,
  RECEPTION_STAFF_PERMISSIONS,
  isReceptionStaffPermission,
  receptionStaffCanCheckIn,
  receptionStaffCanClean,
  receptionStaffCanManageArchive,
  receptionStaffCanManageHousekeeping,
  receptionStaffCanManageTrash,
  receptionStaffHasPermission,
  resolveEffectiveReceptionStaffPermissions,
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
