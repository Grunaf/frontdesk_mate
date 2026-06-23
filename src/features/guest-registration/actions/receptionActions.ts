'use server';

import { revalidatePath } from 'next/cache';
import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  createGuestStay,
  listActiveGuestStays,
  reissueGuestStay,
  revokeGuestStay,
} from '@/entities/guest-stay/server';
import type { CreateGuestStayResult, ReissueGuestStayResult } from '@/entities/guest-stay/server';

export type CreateGuestStayActionResult =
  | CreateGuestStayResult
  | { ok: false; error: 'unauthorized' | 'unknown' };

function resolveCheckInIso(checkInDate: string, checkInTime?: string): string {
  const time = checkInTime?.trim() || '14:00';
  const [hours, minutes = '00'] = time.split(':');
  return `${checkInDate.trim()}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;
}

export async function createGuestStayAction(input: {
  tenantSlug: string;
  bedId: string;
  guestName?: string;
  checkInDate: string;
  checkOutDate: string;
  locale?: string;
}): Promise<CreateGuestStayActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    const checkInAt = resolveCheckInIso(input.checkInDate, tenant?.settings.checkInTime);

    const result = await createGuestStay(
      {
        tenantSlug: input.tenantSlug,
        bedId: input.bedId,
        guestName: input.guestName,
        checkInAt,
        checkOutAt: `${input.checkOutDate.trim()}T23:59:59.999Z`,
      },
      input.locale ?? 'en'
    );

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('createGuestStayAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export async function revokeGuestStayAction(input: { tenantSlug: string; stayId: string }) {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false as const, error: 'unauthorized' as const };
  }

  try {
    const status = await revokeGuestStay(input);
    if (status === 'ok') {
      revalidatePath('/');
      return { ok: true as const };
    }

    return {
      ok: false as const,
      error: status === 'not_found' ? ('not_found' as const) : ('db_unavailable' as const),
    };
  } catch (error) {
    console.error('revokeGuestStayAction:', error);
    return { ok: false as const, error: 'unknown' as const };
  }
}

export async function listActiveGuestStaysAction(tenantSlug: string, locale = 'en') {
  await assertReceptionAuthenticated(tenantSlug);
  return listActiveGuestStays(tenantSlug, locale);
}

export type ReissueGuestStayActionResult =
  | ReissueGuestStayResult
  | { ok: false; error: 'unauthorized' | 'unknown' };

export async function reissueGuestStayAction(input: {
  tenantSlug: string;
  stayId: string;
  bedId: string;
  guestName?: string;
  checkInDate: string;
  checkOutDate: string;
  locale?: string;
}): Promise<ReissueGuestStayActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    const checkInAt = resolveCheckInIso(input.checkInDate, tenant?.settings.checkInTime);

    const result = await reissueGuestStay(
      {
        tenantSlug: input.tenantSlug,
        stayId: input.stayId,
        bedId: input.bedId,
        guestName: input.guestName,
        checkInAt,
        checkOutAt: `${input.checkOutDate.trim()}T23:59:59.999Z`,
      },
      input.locale ?? 'en'
    );

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('reissueGuestStayAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
