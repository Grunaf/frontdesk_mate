'use server';

import { revalidatePath } from 'next/cache';
import {
  cancelOrCheckoutGuestReservation,
  createGuestStay,
  createGuestStayParty,
  completeDeskCheckIn,
  getGuestReservationForDesk,
  listActiveGuestStays,
  listArchivedGuestReservations,
  reissueGuestStay,
  restoreGuestReservation,
  revokeGuestStay,
  updateGuestReservation,
  setGuestReservationBookingPaid,
  setGuestReservationReceptionNote,
  confirmGuestStayContactPhone,
  rejectGuestStayContactPhone,
  setBedUnlockedAt,
  setDeskCheckedInAt,
} from '@/entities/guest-stay/server';
import { clearHousekeepingStayPresence, listHousekeepingBedStatuses } from '@/entities/housekeeping/server';
import { isBedReadyForGuestVisibility, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { getGuestById, searchGuests, type GuestProfile } from '@/entities/guest/server';
import { seedTourismGuestFromGuestProfile } from '@/entities/guest-tourism-registration/server';
import {
  assertCanBypassTourismCheckInGate,
  assertTourismReadyForCheckIn,
} from '@/features/guest-tourism-registration';
import { getTenantRecord, upsertTenant } from '@/entities/tenant/server';
import {
  normalizeHostelworldBookingPrefix,
  normalizeReceptionBookingForSave,
  resolveHostelworldBookingPrefix,
} from '@/entities/tenant';
import { toDateInputValue } from '@/entities/tenant/lib/resolveTenantLifecycle';
import type {
  CreateGuestStayPartyResult,
  CreateGuestStayResult,
  GuestReservationArchiveListItem,
  GuestStayRecordWithLink,
  ReissueGuestStayResult,
  CompleteDeskCheckInResult,
  UpdateGuestReservationResult,
  SetGuestReservationBookingPaidResult,
  SetGuestReservationReceptionNoteResult,
  ConfirmGuestStayContactPhoneResult,
  RejectGuestStayContactPhoneResult,
  SetBedUnlockedAtResult,
  SetDeskCheckedInAtResult,
} from '@/entities/guest-stay/server';
import { recordReceptionDeskAuditEvent } from '../lib/recordReceptionDeskAuditEvent';
import { resolveStayCancelCheckoutAction } from '../lib/resolveStayCancelCheckoutAction';
import {
  assertReceptionCheckInAccess,
  assertReceptionEditPastStaysAccess,
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

export type CreateGuestStayPartyActionResult =
  | CreateGuestStayPartyResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export async function createGuestStayAction(input: {
  tenantSlug: string;
  bedId: string;
  guestName?: string;
  guestId?: string;
  checkInDate: string;
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
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
        guestId: input.guestId,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        bookingPlatformId: input.bookingPlatformId,
        bookingExternalId: input.bookingExternalId,
        bookingAmountDue: input.bookingAmountDue,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
      },
      input.locale ?? 'en'
    );

    if (result.ok) {
      if (result.stay.guest_id) {
        const seeded = await seedTourismGuestFromGuestProfile({
          tenantId: result.stay.tenant_id,
          stayId: result.stay.id,
          guestId: result.stay.guest_id,
        });
        if (!seeded.ok) {
          console.error('createGuestStayAction seed tourism:', seeded.error);
        }
      }
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

export async function createGuestStayPartyAction(input: {
  tenantSlug: string;
  guests: Array<{ bedId: string; guestName?: string; guestId?: string }>;
  checkInDate: string;
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  locale?: string;
}): Promise<CreateGuestStayPartyActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await createGuestStayParty(
      {
        tenantSlug: input.tenantSlug,
        guests: input.guests,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        bookingPlatformId: input.bookingPlatformId,
        bookingExternalId: input.bookingExternalId,
        bookingAmountDue: input.bookingAmountDue,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
      },
      input.locale ?? 'en'
    );

    if (result.ok) {
      const lead = result.stays[0];
      if (lead?.stay.guest_id) {
        const seeded = await seedTourismGuestFromGuestProfile({
          tenantId: lead.stay.tenant_id,
          stayId: lead.stay.id,
          guestId: lead.stay.guest_id,
        });
        if (!seeded.ok) {
          console.error('createGuestStayPartyAction seed tourism:', seeded.error);
        }
      }
      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'createGuestStay',
        subjectId: lead?.stay.id ?? result.bookingGroupId,
        bedId: lead?.stay.bed_id,
      });
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('createGuestStayPartyAction:', error);
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

export type CheckoutPartyReservationsActionResult =
  | { ok: true; checkedOutStayIds: string[]; skippedCount: number }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'not_found'
        | 'already_archived'
        | 'invalid_operational_day'
        | 'db_unavailable'
        | 'unknown';
      blockedStayId?: string;
      checkedOutStayIds: string[];
    };

/** Party root «Check out all»: checkout admitted members only; skip pre-admit. */
export async function checkoutPartyReservationsAction(input: {
  tenantSlug: string;
  stayIds: string[];
  operationalDate: string;
}): Promise<CheckoutPartyReservationsActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error, checkedOutStayIds: [] };
  }

  const stayIds = [...new Set(input.stayIds.map((id) => id.trim()).filter(Boolean))];
  if (stayIds.length === 0) {
    return { ok: false, error: 'not_found', checkedOutStayIds: [] };
  }

  try {
    const eligibleIds: string[] = [];
    for (const stayId of stayIds) {
      const stay = await getGuestReservationForDesk(input.tenantSlug, stayId);
      if (!stay) {
        return { ok: false, error: 'not_found', blockedStayId: stayId, checkedOutStayIds: [] };
      }
      if (stay.stay_kind === 'volunteer') {
        continue;
      }
      const endAction = resolveStayCancelCheckoutAction({
        passport_checked_at: stay.passport_checked_at,
        desk_checked_in_at: stay.desk_checked_in_at,
        check_out_date: stay.check_out_date,
        check_out_at: stay.check_out_at,
        operationalDate: input.operationalDate,
        is_archived: stay.is_archived,
        stay_kind: stay.stay_kind,
      });
      if (endAction === 'checkout') {
        eligibleIds.push(stayId);
      }
    }

    if (eligibleIds.length === 0) {
      return { ok: false, error: 'not_found', checkedOutStayIds: [] };
    }

    const checkedOutStayIds: string[] = [];
    for (const stayId of eligibleIds) {
      const result = await cancelOrCheckoutGuestReservation({
        tenantSlug: input.tenantSlug,
        stayId,
        operationalDate: input.operationalDate,
        archivedByReceptionUserId: staff.ctx.id,
        intent: 'checkout',
      });
      if (!result.ok) {
        if (checkedOutStayIds.length > 0) {
          revalidatePath('/');
        }
        return {
          ok: false,
          error:
            result.error === 'already_archived'
              ? 'already_archived'
              : result.error === 'not_found'
                ? 'not_found'
                : result.error === 'invalid_operational_day'
                  ? 'invalid_operational_day'
                  : 'db_unavailable',
          blockedStayId: stayId,
          checkedOutStayIds,
        };
      }

      await recordReceptionDeskAuditEvent({
        tenantSlug: input.tenantSlug,
        mutation: 'checkoutGuestReservation',
        subjectId: stayId,
      });
      if (result.kind === 'remainder_archived' && result.archiveStayId) {
        await recordReceptionDeskAuditEvent({
          tenantSlug: input.tenantSlug,
          mutation: 'remainderArchived',
          subjectId: result.archiveStayId,
        });
      }
      await clearStayPresenceAfterDeskMutation(input.tenantSlug, stayId);
      checkedOutStayIds.push(stayId);
    }

    revalidatePath('/');
    return {
      ok: true,
      checkedOutStayIds,
      skippedCount: stayIds.length - eligibleIds.length,
    };
  } catch (error) {
    console.error('checkoutPartyReservationsAction:', error);
    return { ok: false, error: 'unknown', checkedOutStayIds: [] };
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
  guestId?: string;
  checkInDate: string;
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  /** Operational calendar day — gates past-edit and unarchive-after-edit. */
  operationalDate: string;
}): Promise<UpdateGuestReservationActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  const existing = await getGuestReservationForDesk(input.tenantSlug, input.stayId);
  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const stayEnded =
    Boolean(existing.is_archived) || input.operationalDate >= stayRecordCheckOutDate(existing);
  const allowPastEdit = stayEnded;
  if (allowPastEdit) {
    const pastGate = assertReceptionEditPastStaysAccess(staff.ctx);
    if (!pastGate.ok) {
      return { ok: false, error: pastGate.error };
    }
  }

  try {
    const result = await updateGuestReservation({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      bedId: input.bedId,
      guestName: input.guestName,
      guestId: input.guestId,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      bookingPlatformId: input.bookingPlatformId,
      bookingExternalId: input.bookingExternalId,
      bookingAmountDue: input.bookingAmountDue,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      allowPastEdit,
      operationalDate: input.operationalDate,
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

export type SetGuestReservationReceptionNoteActionResult =
  | SetGuestReservationReceptionNoteResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export async function setGuestReservationReceptionNoteAction(input: {
  tenantSlug: string;
  stayId: string;
  note: string | null;
}): Promise<SetGuestReservationReceptionNoteActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await setGuestReservationReceptionNote({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      note: input.note,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('setGuestReservationReceptionNoteAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type SaveHostelworldBookingPrefixActionResult =
  | { ok: true; prefix: string }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'invalid_prefix'
        | 'already_set'
        | 'tenant_not_found'
        | 'db_unavailable'
        | 'unknown';
    };

/** Bootstrap Hostelworld 6-digit property prefix from first reception booking. */
export async function saveHostelworldBookingPrefixAction(input: {
  tenantSlug: string;
  prefix: string;
}): Promise<SaveHostelworldBookingPrefixActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  const normalized = normalizeHostelworldBookingPrefix(input.prefix);
  if (!normalized) {
    return { ok: false, error: 'invalid_prefix' };
  }

  try {
    const previous = await getTenantRecord(input.tenantSlug);
    if (!previous) {
      return { ok: false, error: 'tenant_not_found' };
    }

    const existing = resolveHostelworldBookingPrefix(previous.settings);
    if (existing) {
      if (existing === normalized) {
        return { ok: true, prefix: existing };
      }
      return { ok: false, error: 'already_set' };
    }

    const receptionBooking = normalizeReceptionBookingForSave({
      platforms: previous.settings.receptionBooking?.platforms ?? [],
      bookingComHotelId: previous.settings.receptionBooking?.bookingComHotelId,
      hostelworldBookingPrefix: normalized,
    });

    const nextSettings = {
      ...previous.settings,
      ...(receptionBooking ? { receptionBooking } : {}),
    };

    const result = await upsertTenant({
      slug: previous.slug,
      originalSlug: previous.slug,
      name: previous.name,
      cityPackId: previous.city_pack_id,
      settings: nextSettings,
      subscriptionStartsAt: toDateInputValue(previous.subscription_starts_at ?? ''),
      subscriptionEndsAt: toDateInputValue(previous.subscription_ends_at ?? ''),
    });

    if (!result.ok) {
      console.error('saveHostelworldBookingPrefixAction:', result.error);
      return { ok: false, error: 'db_unavailable' };
    }

    revalidatePath('/');
    return { ok: true, prefix: normalized };
  } catch (error) {
    console.error('saveHostelworldBookingPrefixAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type ConfirmGuestStayContactPhoneActionResult =
  | ConfirmGuestStayContactPhoneResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export async function confirmGuestStayContactPhoneAction(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<ConfirmGuestStayContactPhoneActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await confirmGuestStayContactPhone({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('confirmGuestStayContactPhoneAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type RejectGuestStayContactPhoneActionResult =
  | RejectGuestStayContactPhoneResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export async function rejectGuestStayContactPhoneAction(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<RejectGuestStayContactPhoneActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await rejectGuestStayContactPhone({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('rejectGuestStayContactPhoneAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type CompleteDeskCheckInActionResult =
  | CompleteDeskCheckInResult
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'bed_not_ready'
        | 'not_found'
        | 'tourism_incomplete'
        | 'missing_documents'
        | 'unknown';
    };

export type SetDeskCheckedInForReceptionActionResult =
  | SetDeskCheckedInAtResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'unknown' };

export type UnlockBedForReceptionActionResult =
  | SetBedUnlockedAtResult
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'bed_not_ready' | 'unknown' };

export async function unlockBedForReceptionAction(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<UnlockBedForReceptionActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const stay = await getGuestReservationForDesk(input.tenantSlug, input.stayId);
    if (!stay) {
      return { ok: false, error: 'not_found' };
    }

    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant) {
      return { ok: false, error: 'not_found' };
    }

    const bedStatuses = await listHousekeepingBedStatuses(tenant.id);
    const bedStatus = bedStatuses.find((row) => row.bed_id === stay.bed_id)?.status;
    if (!isBedReadyForGuestVisibility(bedStatus)) {
      return { ok: false, error: 'bed_not_ready' };
    }

    const result = await setBedUnlockedAt({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('unlockBedForReceptionAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export async function completeDeskCheckInAction(input: {
  tenantSlug: string;
  stayId: string;
  keyIssued?: boolean;
  bypassAccessGate?: boolean;
}): Promise<CompleteDeskCheckInActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    if (input.bypassAccessGate) {
      const bypass = await assertCanBypassTourismCheckInGate(input.tenantSlug);
      if (bypass !== 'ok') {
        return { ok: false, error: bypass };
      }
    } else {
      const gate = await assertTourismReadyForCheckIn(input.tenantSlug, input.stayId);
      if (gate === 'tourism_incomplete' || gate === 'missing_documents') {
        return { ok: false, error: gate };
      }
    }

    const stay = await getGuestReservationForDesk(input.tenantSlug, input.stayId);
    if (!stay) {
      return { ok: false, error: 'not_found' };
    }
    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant) {
      return { ok: false, error: 'not_found' };
    }
    const bedStatuses = await listHousekeepingBedStatuses(tenant.id);
    const bedStatus = bedStatuses.find((row) => row.bed_id === stay.bed_id)?.status;
    if (!isBedReadyForGuestVisibility(bedStatus)) {
      return { ok: false, error: 'bed_not_ready' };
    }

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

/** Un-admit (clear desk check-in). Leaves passport checklist and bed_unlocked_at intact. */
export async function setDeskCheckedInForReceptionAction(input: {
  tenantSlug: string;
  stayId: string;
  checked: boolean;
  keyIssued?: boolean;
}): Promise<SetDeskCheckedInForReceptionActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const result = await setDeskCheckedInAt({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      checked: input.checked,
      keyIssued: input.keyIssued,
    });

    if (result.ok) {
      revalidatePath('/');
    }

    return result;
  } catch (error) {
    console.error('setDeskCheckedInForReceptionAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type SearchGuestProfilesActionResult =
  | { ok: true; items: GuestProfile[] }
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'db_unavailable' | 'unknown' };

export async function searchGuestProfilesAction(input: {
  tenantSlug: string;
  query: string;
}): Promise<SearchGuestProfilesActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant) {
      return { ok: false, error: 'db_unavailable' };
    }
    const result = await searchGuests({
      tenantId: tenant.id,
      query: input.query,
    });
    if (!result.ok) {
      return { ok: false, error: 'db_unavailable' };
    }
    return { ok: true, items: result.items };
  } catch (error) {
    console.error('searchGuestProfilesAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type GetGuestProfileActionResult =
  | { ok: true; guest: GuestProfile }
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'not_found' | 'db_unavailable' | 'unknown' };

export async function getGuestProfileAction(input: {
  tenantSlug: string;
  guestId: string;
}): Promise<GetGuestProfileActionResult> {
  const staff = await requireCheckInStaff(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: staff.error };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant) {
      return { ok: false, error: 'db_unavailable' };
    }
    const guest = await getGuestById(tenant.id, input.guestId);
    if (!guest) {
      return { ok: false, error: 'not_found' };
    }
    return { ok: true, guest };
  } catch (error) {
    console.error('getGuestProfileAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
