/**
 * Reception desk function permissions (whitelist).
 * Legacy empty `permissions: []` is treated as check-in at the capability layer
 * (`resolveEffectiveReceptionStaffPermissions` / `receptionStaffCanCheckIn`).
 * Skip-tourism and edit-past-stays are never implied by empty legacy — must be granted explicitly.
 */
export const RECEPTION_STAFF_PERMISSIONS = [
  'desk.check_in',
  'desk.cleaning',
  'desk.skip_tourism_gate',
  'desk.edit_past_stays',
] as const;

export type ReceptionStaffPermission = (typeof RECEPTION_STAFF_PERMISSIONS)[number];

export const DESK_CHECK_IN_PERMISSION = 'desk.check_in' satisfies ReceptionStaffPermission;
export const DESK_CLEANING_PERMISSION = 'desk.cleaning' satisfies ReceptionStaffPermission;
export const DESK_SKIP_TOURISM_GATE_PERMISSION =
  'desk.skip_tourism_gate' satisfies ReceptionStaffPermission;
export const DESK_EDIT_PAST_STAYS_PERMISSION =
  'desk.edit_past_stays' satisfies ReceptionStaffPermission;

/** Legacy keys from trash/archive experiments — always dropped on sanitize. */
const LEGACY_DROPPED_PERMISSIONS = new Set([
  'reservation.trash.read',
  'reservation.trash.restore',
  'reservation.trash.purge',
  'reservation.archive.read',
  'reservation.archive.restore',
  'reservation.archive.purge',
]);

export function isReceptionStaffPermission(value: string): value is ReceptionStaffPermission {
  return (RECEPTION_STAFF_PERMISSIONS as readonly string[]).includes(value);
}

/** Normalize unknown DB/form values to the whitelist (deduped, order preserved). */
export function sanitizeReceptionStaffPermissions(
  values: readonly string[] | null | undefined
): ReceptionStaffPermission[] {
  if (!values?.length) return [];
  const seen = new Set<ReceptionStaffPermission>();
  const result: ReceptionStaffPermission[] = [];
  for (const raw of values) {
    if (LEGACY_DROPPED_PERMISSIONS.has(raw)) continue;
    if (!isReceptionStaffPermission(raw) || seen.has(raw)) continue;
    seen.add(raw);
    result.push(raw);
  }
  return result;
}

/**
 * Effective desk functions after sanitize.
 * Empty / legacy-only → check-in (compat for existing staff + new volunteers).
 * Does not add `desk.skip_tourism_gate` or `desk.edit_past_stays`.
 */
export function resolveEffectiveReceptionStaffPermissions(
  values: readonly string[] | null | undefined
): ReceptionStaffPermission[] {
  const sanitized = sanitizeReceptionStaffPermissions(values);
  if (sanitized.length === 0) return [DESK_CHECK_IN_PERMISSION];
  return sanitized;
}

export function receptionStaffHasPermission(
  permissions: readonly string[] | null | undefined,
  permission: ReceptionStaffPermission
): boolean {
  return resolveEffectiveReceptionStaffPermissions(permissions).includes(permission);
}

export function receptionStaffCanCheckIn(
  permissions: readonly string[] | null | undefined
): boolean {
  return receptionStaffHasPermission(permissions, DESK_CHECK_IN_PERMISSION);
}

export function receptionStaffCanClean(
  permissions: readonly string[] | null | undefined
): boolean {
  return receptionStaffHasPermission(permissions, DESK_CLEANING_PERMISSION);
}

/** Check-in / grant while tourism registration is incomplete (client confirm + server gate). */
export function receptionStaffCanSkipTourismGate(
  permissions: readonly string[] | null | undefined
): boolean {
  return receptionStaffHasPermission(permissions, DESK_SKIP_TOURISM_GATE_PERMISSION);
}

/**
 * Edit dates / bed / booking fields on ended or checked-out archived stays.
 * Never implied by empty legacy — must be granted explicitly (with check-in for desk UI).
 */
export function receptionStaffCanEditPastStays(
  permissions: readonly string[] | null | undefined
): boolean {
  return receptionStaffHasPermission(permissions, DESK_EDIT_PAST_STAYS_PERMISSION);
}

/** Housekeeping status updates: Plan (check-in) or Cleaning desk. */
export function receptionStaffCanManageHousekeeping(
  permissions: readonly string[] | null | undefined
): boolean {
  return receptionStaffCanCheckIn(permissions) || receptionStaffCanClean(permissions);
}

/** @deprecated Archive is part of check-in desk; prefer receptionStaffCanCheckIn. */
export function receptionStaffCanManageArchive(
  permissions?: readonly string[] | null
): boolean {
  return receptionStaffCanCheckIn(permissions);
}

/** @deprecated Prefer receptionStaffCanManageArchive */
export function receptionStaffCanManageTrash(
  permissions?: readonly string[] | null
): boolean {
  return receptionStaffCanManageArchive(permissions);
}
