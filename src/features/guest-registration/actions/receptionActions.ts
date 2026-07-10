'use server';

import { revalidatePath } from 'next/cache';
import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  createGuestStay,
  completeDeskCheckIn,
  listActiveGuestStays,
  reissueGuestStay,
  revokeGuestStay,
  updateGuestReservation,
  setGuestReservationBookingPaid,
} from '@/entities/guest-stay/server';
import type {
  CreateGuestStayResult,
  ReissueGuestStayResult,
  CompleteDeskCheckInResult,
  UpdateGuestReservationResult,
  SetGuestReservationBookingPaidResult,
} from '@/entities/guest-stay/server';

export type CreateGuestStayActionResult =
  | CreateGuestStayResult
  | { ok: false; error: 'unauthorized' | 'unknown' };

/** Combines desk check-in date with tenant checkInTime. The Z suffix is storage-only (v1), not hostel IANA TZ. */
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
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string;
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
        bookingPlatformId: input.bookingPlatformId,
        bookingExternalId: input.bookingExternalId,
        bookingAmountDue: input.bookingAmountDue,
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
  locale?: string;
}): Promise<ReissueGuestStayActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const result = await reissueGuestStay(
      {
        tenantSlug: input.tenantSlug,
        stayId: input.stayId,
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

export type UpdateGuestReservationActionResult =
  | UpdateGuestReservationResult
  | { ok: false; error: 'unauthorized' | 'unknown' };

export async function updateGuestReservationAction(input: {
  tenantSlug: string;
  stayId: string;
  bedId: string;
  guestName?: string;
  checkInDate: string;
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string;
}): Promise<UpdateGuestReservationActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    const checkInAt = resolveCheckInIso(input.checkInDate, tenant?.settings.checkInTime);

    const result = await updateGuestReservation({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      bedId: input.bedId,
      guestName: input.guestName,
      checkInAt,
      checkOutAt: `${input.checkOutDate.trim()}T23:59:59.999Z`,
      bookingPlatformId: input.bookingPlatformId,
      bookingExternalId: input.bookingExternalId,
      bookingAmountDue: input.bookingAmountDue,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('updateGuestReservationAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type SetGuestReservationBookingPaidActionResult =
  | SetGuestReservationBookingPaidResult
  | { ok: false; error: 'unauthorized' | 'unknown' };

export async function setGuestReservationBookingPaidAction(input: {
  tenantSlug: string;
  stayId: string;
  paid: boolean;
}): Promise<SetGuestReservationBookingPaidActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const result = await setGuestReservationBookingPaid({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      paid: input.paid,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('setGuestReservationBookingPaidAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type CompleteDeskCheckInActionResult =
  | CompleteDeskCheckInResult
  | { ok: false; error: 'unauthorized' | 'unknown' };

export async function completeDeskCheckInAction(input: {
  tenantSlug: string;
  stayId: string;
  keyIssued?: boolean;
}): Promise<CompleteDeskCheckInActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const result = await completeDeskCheckIn({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      keyIssued: input.keyIssued,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('completeDeskCheckInAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
