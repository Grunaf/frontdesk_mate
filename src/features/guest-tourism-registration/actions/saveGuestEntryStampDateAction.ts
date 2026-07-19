'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { isValidEntryStampDate } from '@/entities/guest-tourism-registration';
import {
  listTourismGuestsByStayId,
  setTourismGuestEntryStampDate,
} from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';

export type GuestEntryDateAssignment = {
  guestId: string;
  entryStampDate: string;
};

export type SaveGuestEntryStampDatesPayload =
  | { mode: 'same'; entryStampDate: string }
  | { mode: 'different'; dates: GuestEntryDateAssignment[] };

export type SaveGuestEntryStampDatesActionResult =
  | { ok: true; entryStampDate: string | null }
  | {
      ok: false;
      error:
        | 'feature_disabled'
        | 'unauthorized'
        | 'invalid_date'
        | 'no_guests'
        | 'db_unavailable'
        | 'unknown';
    };

/** @deprecated Prefer saveGuestEntryStampDatesAction with mode: 'same'. */
export type SaveGuestEntryStampDateActionResult =
  | { ok: true; entryStampDate: string }
  | {
      ok: false;
      error:
        | 'feature_disabled'
        | 'unauthorized'
        | 'invalid_date'
        | 'no_guests'
        | 'db_unavailable'
        | 'unknown';
    };

async function applyEntryDatesForStay(
  stayId: string,
  assignments: GuestEntryDateAssignment[]
): Promise<SaveGuestEntryStampDatesActionResult> {
  if (assignments.length === 0) {
    return { ok: false, error: 'no_guests' };
  }

  for (const assignment of assignments) {
    if (!isValidEntryStampDate(assignment.entryStampDate)) {
      return { ok: false, error: 'invalid_date' };
    }
  }

  for (const assignment of assignments) {
    const result = await setTourismGuestEntryStampDate(
      stayId,
      assignment.guestId,
      assignment.entryStampDate
    );
    if (!result.ok) {
      return {
        ok: false,
        error: result.error === 'invalid_date' ? 'invalid_date' : 'db_unavailable',
      };
    }
  }

  const dates = assignments.map((item) => item.entryStampDate);
  const first = dates[0] ?? null;
  const shared = first && dates.every((value) => value === first) ? first : first;

  return { ok: true, entryStampDate: shared };
}

export async function saveGuestEntryStampDatesAction(
  tenantSlug: string,
  payload: SaveGuestEntryStampDatesPayload
): Promise<SaveGuestEntryStampDatesActionResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'unauthorized' };
  }

  const tenant = await getTenantRecord(slug);
  if (!tenant || !resolveTourismRegistrationRequired(tenant.settings)) {
    return { ok: false, error: 'feature_disabled' };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session) {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const guests = await listTourismGuestsByStayId(session.stayId);
    if (guests.length === 0) {
      return { ok: false, error: 'no_guests' };
    }

    const guestIds = new Set(guests.map((guest) => guest.id));

    if (payload.mode === 'same') {
      const date = payload.entryStampDate.trim();
      if (!isValidEntryStampDate(date)) {
        return { ok: false, error: 'invalid_date' };
      }

      return applyEntryDatesForStay(
        session.stayId,
        guests.map((guest) => ({ guestId: guest.id, entryStampDate: date }))
      );
    }

    if (payload.dates.length !== guests.length) {
      return { ok: false, error: 'invalid_date' };
    }

    for (const assignment of payload.dates) {
      if (!guestIds.has(assignment.guestId)) {
        return { ok: false, error: 'unauthorized' };
      }
    }

    return applyEntryDatesForStay(
      session.stayId,
      payload.dates.map((item) => ({
        guestId: item.guestId,
        entryStampDate: item.entryStampDate.trim(),
      }))
    );
  } catch (error) {
    console.error('saveGuestEntryStampDatesAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

/** Same-day convenience wrapper. */
export async function saveGuestEntryStampDateAction(
  tenantSlug: string,
  entryStampDate: string
): Promise<SaveGuestEntryStampDateActionResult> {
  const result = await saveGuestEntryStampDatesAction(tenantSlug, {
    mode: 'same',
    entryStampDate,
  });
  if (!result.ok) {
    return result;
  }
  if (!result.entryStampDate) {
    return { ok: false, error: 'invalid_date' };
  }
  return { ok: true, entryStampDate: result.entryStampDate };
}
