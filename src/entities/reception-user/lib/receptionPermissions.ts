/**
 * Reception staff permission whitelist (v1: empty).
 * Archive list/restore are available to any authenticated reception staff.
 * Purge/hard-delete is out of scope for Archive v1.
 */
export const RECEPTION_STAFF_PERMISSIONS = [] as const;

export type ReceptionStaffPermission = (typeof RECEPTION_STAFF_PERMISSIONS)[number];

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

export function receptionStaffHasPermission(
  permissions: readonly string[] | null | undefined,
  permission: ReceptionStaffPermission
): boolean {
  return sanitizeReceptionStaffPermissions(permissions).includes(permission);
}

/** @deprecated Archive is available to all authenticated reception staff. */
export function receptionStaffCanManageArchive(
  _permissions?: readonly string[] | null
): boolean {
  return true;
}

/** @deprecated Prefer receptionStaffCanManageArchive */
export function receptionStaffCanManageTrash(
  permissions?: readonly string[] | null
): boolean {
  return receptionStaffCanManageArchive(permissions);
}
