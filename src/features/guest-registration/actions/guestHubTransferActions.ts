'use server';

import { revalidatePath } from 'next/cache';
import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
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

export async function listGuestHubTransfersAction(
  tenantSlug: string,
  filter: ListGuestHubTransfersFilter
): Promise<GuestHubTransferRecord[]> {
  try {
    await assertReceptionAuthenticated(tenantSlug);
  } catch {
    return [];
  }

  return listGuestHubTransfers(tenantSlug, filter);
}

export async function countOpenGuestHubTransfersAction(tenantSlug: string): Promise<number> {
  try {
    await assertReceptionAuthenticated(tenantSlug);
  } catch {
    return 0;
  }

  return countOpenGuestHubTransfers(tenantSlug);
}

export async function resolveGuestHubTransferAction(input: {
  tenantSlug: string;
  transferId: string;
}): Promise<ResolveGuestHubTransferResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'not_found' };
  }

  try {
    const result = await resolveGuestHubTransfer({
      tenantSlug: input.tenantSlug,
      transferId: input.transferId,
    });
    if (result.ok) {
      revalidatePath('/');
    }
    return result;
  } catch (error) {
    console.error('resolveGuestHubTransferAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}
