'use server';

import { revalidatePath } from 'next/cache';
import {
  cancelOrCheckoutGuestReservation,
  createGuestStay,
  completeDeskCheckIn,
  getGuestReservationForDesk,
  listActiveGuestStays,
  listArchivedGuestReservations,
  reissueGuestStay,
  restoreGuestReservation,
  revokeGuestStay,
  updateGuestReservation,
  setGuestReservationBookingPaid,
} from '@/entities/guest-stay/server';
import { clearHousekeepingStayPresence } from '@/entities/housekeeping/server';
import { getTenantRecord } from '@/entities/tenant/server';
import type {
  CreateGuestStayResult,
  GuestReservationArchiveListItem,
  GuestStayRecordWithLink,
  ReissueGuestStayResult,
  CompleteDeskCheckInResult,
  UpdateGuestReservationResult,
  SetGuestReservationBookingPaidResult,
} from '@/entities/guest-stay/server';
import { recordReceptionDeskAuditEvent } from '../lib/recordReceptionDeskAuditEvent';
import {
  assertReceptionCheckInAccess,
  resolveReceptionStaffContext,
  type ReceptionStaffContext,
} from '../lib/resolveReceptionStaffContext';

async function requireCheckInStaff(
  tenantSlug: string
): Promise<
  | { ok: true; ctx: ReceptionStaffContext }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  const staff = await resolveReceptionStaffContext(tenantSlug);
  if (!staff.ok) return staff;
  const gate = assertReceptionCheckInAccess(staff.ctx);
  if (!gate.ok) return gate;
  return staff;
}

async function clearStayPresenceAfterDeskMutation(tenantSlug: string, stayId: string) {
  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return;
  await clearHousekeepingStayPresence({ tenantId: tenant.id, stayId });
}

export type CreateGuestStayActionResult =
  | CreateGuestStayResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

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
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await createGuestStay(
      {
        tenantSlug: input.tenantSlug,
        bedId: input.bedId,
        guestName: input.guestName,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        bookingPlatformId: input.bookingPlatformId,
        bookingExternalId: input.bookingExternalId,
        bookingAmountDue: input.bookingAmountDue,
      },
      input.locale ?? 'en'
    );

    if (result.ok) {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'createGuestStay',
        subjectId: result.stay.id,
        bedId: result.stay.bed_id || input.bedId,
      });
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('createGuestStayAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export async function revokeGuestStayAction(input: { tenantSlug: string; stayId: string }) {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false as const, error: staff.error };
  }

  try {
    // Variant A: revoke = archive (grant + cancelled).
    const status = await revokeGuestStay(input);
    if (status === 'ok') {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'revokeGuestStay',
        subjectId: input.stayId,
      });
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

export async function archiveGuestReservationAction(input: {
  tenantSlug: string;
  stayId: string;
  operationalDate: string;
}) {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false as const, error: staff.error };
  }

  try {
    const existing = await getGuestReservationForDesk(input.tenantSlug, input.stayId);
    if (existing?.stay_kind === 'volunteer') {
      return { ok: false as const, error: 'forbidden' as const };
    }

    const result = await cancelOrCheckoutGuestReservation({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      operationalDate: input.operationalDate,
      archivedByReceptionUserId: staff.ctx.id,
      intent: 'cancel',
    });
    if (result.ok) {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'cancelGuestReservation',
        subjectId: input.stayId,
      });
      await clearStayPresenceAfterDeskMutation(input.tenantSlug, input.stayId);
      revalidatePath('/');
      return { ok: true as const, kind: result.kind };
    }

    return {
      ok: false as const,
      error:
        result.error === 'already_archived'
          ? ('already_archived' as const)
          : result.error === 'not_found'
            ? ('not_found' as const)
            : result.error === 'invalid_operational_day'
              ? ('invalid_operational_day' as const)
              : ('db_unavailable' as const),
    };
  } catch (error) {
    console.error('archiveGuestReservationAction:', error);
    return { ok: false as const, error: 'unknown' as const };
  }
}

export async function cancelGuestReservationAction(input: {
  tenantSlug: string;
  stayId: string;
  operationalDate: string;
}) {
  return archiveGuestReservationAction(input);
}

export async function checkoutGuestReservationAction(input: {
  tenantSlug: string;
  stayId: string;
  operationalDate: string;
}) {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false as const, error: staff.error };
  }

  try {
    const existing = await getGuestReservationForDesk(input.tenantSlug, input.stayId);
    if (existing?.stay_kind === 'volunteer') {
      return { ok: false as const, error: 'forbidden' as const };
    }

    const result = await cancelOrCheckoutGuestReservation({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      operationalDate: input.operationalDate,
      archivedByReceptionUserId: staff.ctx.id,
      intent: 'checkout',
    });
    if (result.ok) {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'checkoutGuestReservation',
        subjectId: input.stayId,
      });
      if (result.kind === 'remainder_archived' && result.archiveStayId) {
        await recordReceptionDeskAuditEvent({
          tenantSlug: input.tenantSlug,
          mutation: 'remainderArchived',
          subjectId: result.archiveStayId,
        });
      }
      await clearStayPresenceAfterDeskMutation(input.tenantSlug, input.stayId);
      revalidatePath('/');
      return { ok: true as const, kind: result.kind, archiveStayId: result.archiveStayId };
    }

    return {
      ok: false as const,
      error:
        result.error === 'already_archived'
          ? ('already_archived' as const)
          : result.error === 'not_found'
            ? ('not_found' as const)
            : result.error === 'invalid_operational_day'
              ? ('invalid_operational_day' as const)
              : ('db_unavailable' as const),
    };
  } catch (error) {
    console.error('checkoutGuestReservationAction:', error);
    return { ok: false as const, error: 'unknown' as const };
  }
}

/** @deprecated Prefer cancelGuestReservationAction */
export async function trashGuestReservationAction(input: {
  tenantSlug: string;
  stayId: string;
  operationalDate: string;
}) {
  return cancelGuestReservationAction(input);
}

export async function listArchivedGuestReservationsAction(
  tenantSlug: string
): Promise<
  | { ok: true; items: GuestReservationArchiveListItem[] }
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' }
> {
  const staff = await requireCheckInStaff(tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const items = await listArchivedGuestReservations(tenantSlug);
    return { ok: true, items };
  } catch (error) {
    console.error('listArchivedGuestReservationsAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

/** @deprecated Prefer listArchivedGuestReservationsAction */
export async function listTrashedGuestReservationsAction(tenantSlug: string) {
  return listArchivedGuestReservationsAction(tenantSlug);
}

export async function getGuestReservationForDeskAction(input: {
  tenantSlug: string;
  stayId: string;
  locale?: string;
}): Promise<
  | { ok: true; stay: GuestStayRecordWithLink }
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown' }
> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const stay = await getGuestReservationForDesk(
      input.tenantSlug,
      input.stayId,
      input.locale ?? 'en'
    );
    if (!stay) return { ok: false, error: 'not_found' };
    return { ok: true, stay };
  } catch (error) {
    console.error('getGuestReservationForDeskAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export async function restoreGuestReservationAction(input: {
  tenantSlug: string;
  stayId: string;
}) {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false as const, error: staff.error };
  }

  try {
    const status = await restoreGuestReservation(input);
    if (status === 'ok') {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'restoreGuestReservation',
        subjectId: input.stayId,
      });
      revalidatePath('/');
      return { ok: true as const };
    }

    return {
      ok: false as const,
      error:
        status === 'not_archived'
          ? ('not_archived' as const)
          : status === 'original_missing'
            ? ('original_missing' as const)
            : status === 'access_overlap'
              ? ('access_overlap' as const)
              : status === 'not_found'
                ? ('not_found' as const)
                : ('db_unavailable' as const),
    };
  } catch (error) {
    console.error('restoreGuestReservationAction:', error);
    return { ok: false as const, error: 'unknown' as const };
  }
}export async function listActiveGuestStaysAction(tenantSlug: string, locale = 'en') {
  const staff = await requireCheckInStaff(tenantSlug);
  if (!staff.ok) {
    throw new Error(staff.error);
  }
  return listActiveGuestStays(tenantSlug, locale);
}

export type ReissueGuestStayActionResult =
  | ReissueGuestStayResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export async function reissueGuestStayAction(input: {
  tenantSlug: string;
  stayId: string;
  locale?: string;
}): Promise<ReissueGuestStayActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
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
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'reissueGuestStay',
        subjectId: result.stay.id,
      });
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
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

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
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await updateGuestReservation({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      bedId: input.bedId,
      guestName: input.guestName,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      bookingPlatformId: input.bookingPlatformId,
      bookingExternalId: input.bookingExternalId,
      bookingAmountDue: input.bookingAmountDue,
    });

    if (result.ok) {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'updateGuestReservation',
        subjectId: result.stay.id,
        bedId: result.stay.bed_id || input.bedId,
      });
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
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export async function setGuestReservationBookingPaidAction(input: {
  tenantSlug: string;
  stayId: string;
  paid: boolean;
}): Promise<SetGuestReservationBookingPaidActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await setGuestReservationBookingPaid({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      paid: input.paid,
    });

    if (result.ok) {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'setGuestReservationBookingPaid',
        subjectId: result.stay.id,
        paid: input.paid,
      });
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
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export async function completeDeskCheckInAction(input: {
  tenantSlug: string;
  stayId: string;
  keyIssued?: boolean;
}): Promise<CompleteDeskCheckInActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await completeDeskCheckIn({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      keyIssued: input.keyIssued,
    });

    if (result.ok) {
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'completeDeskCheckIn',
        subjectId: result.stay.id,
      });
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('completeDeskCheckInAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
