import 'server-only';

import { readReceptionSessionFromCookies } from '@/app/reception/lib/receptionSession';
import {
  findReceptionUserById,
  receptionStaffCanCheckIn,
  receptionStaffCanClean,
  receptionStaffCanManageHousekeeping,
  receptionStaffHasPermission,
  type ReceptionStaffPermission,
  type ReceptionUserRecord,
} from '@/entities/reception-user/server';

export type ReceptionStaffContext = {
  id: string;
  displayName: string;
  permissions: ReceptionStaffPermission[];
  disabled: boolean;
};

export type ResolveReceptionStaffContextResult =
  | { ok: true; ctx: ReceptionStaffContext }
  | { ok: false; error: 'unauthorized' | 'forbidden' };

function toStaffContext(user: ReceptionUserRecord): ReceptionStaffContext {
  return {
    id: user.id,
    displayName: user.display_name,
    permissions: user.permissions,
    disabled: Boolean(user.disabled_at),
  };
}

export async function resolveReceptionStaffContext(
  tenantSlug: string
): Promise<ResolveReceptionStaffContextResult> {
  const session = await readReceptionSessionFromCookies();
  if (!session || session.tenantSlug !== tenantSlug) {
    return { ok: false, error: 'unauthorized' };
  }

  const user = await findReceptionUserById(tenantSlug, session.receptionUserId);
  if (!user || user.disabled_at) {
    return { ok: false, error: 'unauthorized' };
  }

  return { ok: true, ctx: toStaffContext(user) };
}

export function assertReceptionPermission(
  ctx: ReceptionStaffContext,
  permission: ReceptionStaffPermission
): boolean {
  return receptionStaffHasPermission(ctx.permissions, permission);
}

export function staffCanCheckIn(ctx: ReceptionStaffContext): boolean {
  return receptionStaffCanCheckIn(ctx.permissions);
}

export function staffCanClean(ctx: ReceptionStaffContext): boolean {
  return receptionStaffCanClean(ctx.permissions);
}

export function staffCanManageHousekeeping(ctx: ReceptionStaffContext): boolean {
  return receptionStaffCanManageHousekeeping(ctx.permissions);
}

/** Check-in desk mutations (Plan / Access / Cash / Archive / …). */
export function assertReceptionCheckInAccess(
  ctx: ReceptionStaffContext
): { ok: true } | { ok: false; error: 'forbidden' } {
  if (!staffCanCheckIn(ctx)) {
    return { ok: false, error: 'forbidden' };
  }
  return { ok: true };
}

/** Housekeeping status list/update (Plan chips or Cleaning desk). */
export function assertReceptionHousekeepingAccess(
  ctx: ReceptionStaffContext
): { ok: true } | { ok: false; error: 'forbidden' } {
  if (!staffCanManageHousekeeping(ctx)) {
    return { ok: false, error: 'forbidden' };
  }
  return { ok: true };
}
