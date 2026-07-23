'use server';

import { revalidatePath } from 'next/cache';
import {
  countOpenGuestHubTransfers,
  listGuestHubTransfers,
  resolveGuestHubTransfer,
} from '@/entities/guest-hub-transfer/server';
import type {
  GuestHubTransferRecord,
  ListGuestHubTransfersFilter,
  ResolveGuestHubTransferResult,
} from '@/entities/guest-hub-transfer/server';
import { recordReceptionDeskAuditEvent } from '../lib/recordReceptionDeskAuditEvent';
import {
  assertReceptionCheckInAccess,
  resolveReceptionStaffContext,
} from '../lib/resolveReceptionStaffContext';

async function requireCheckIn(tenantSlug: string) {
  const staff = await resolveReceptionStaffContext(tenantSlug);
  if (!staff.ok) return staff;
  const gate = assertReceptionCheckInAccess(staff.ctx);
  if (!gate.ok) return gate;
  return staff;
}

export async function listGuestHubTransfersAction(
  tenantSlug: string,
  filter: ListGuestHubTransfersFilter
): Promise<GuestHubTransferRecord[]> {
  const staff = await requireCheckIn(tenantSlug);
  if (!staff.ok) return [];

  return listGuestHubTransfers(tenantSlug, filter);
}

export async function countOpenGuestHubTransfersAction(tenantSlug: string): Promise<number> {
  const staff = await requireCheckIn(tenantSlug);
  if (!staff.ok) return 0;

  return countOpenGuestHubTransfers(tenantSlug);
}

export async function resolveGuestHubTransferAction(input: {
  tenantSlug: string;
  transferId: string;
}): Promise<ResolveGuestHubTransferResult> {
  const staff = await requireCheckIn(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: 'not_found' };
  }

  try {
    const result = await resolveGuestHubTransfer({
      tenantSlug: input.tenantSlug,
      transferId: input.transferId,
    });
    if (result.ok) {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'resolveGuestHubTransfer',
        subjectId: input.transferId,
      });
      revalidatePath('/');
    }
    return result;
  } catch (error) {
    console.error('resolveGuestHubTransferAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}
