'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import {
  isValidEntryStampDate,
  type EntryDetailsStatus,
  type EntryTransportType,
} from '@/entities/guest-tourism-registration';
import {
  listTourismGuestsByStayId,
  setStayEntryDetails,
  setTourismGuestEntryStampDate,
} from '@/entities/guest-tourism-registration/server';
import {
  resolveTourismRegistrationConfig,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { DEFAULT_TOURISM_PROFILE_ID } from '../model/tourismRegistrationProfiles';
import { validateEntryDetailsSave } from '../lib/validateEntryDetailsSave';

export type GuestEntryDateAssignment = {
  guestId: string;
  entryStampDate: string;
  entryStampPage?: number | null;
};

export type SaveGuestEntryStampDatesPayload =
  | { mode: 'same'; entryStampDate: string; stampPages?: Record<string, number | null> }
  | { mode: 'different'; dates: GuestEntryDateAssignment[] };

export type SaveGuestEntryDetailsPayload = {
  intent: 'save' | 'skip';
  transportType?: EntryTransportType | string;
  entryPointCode?: string | null;
  entryPointLabel?: string;
  dates?: SaveGuestEntryStampDatesPayload;
};

export type SaveGuestEntryStampDatesActionResult =
  | {
      ok: true;
      entryStampDate: string | null;
      entryDetailsStatus: EntryDetailsStatus;
    }
  | {
      ok: false;
      error:
        | 'feature_disabled'
        | 'unauthorized'
        | 'invalid_date'
        | 'invalid_transport'
        | 'invalid_entry_point'
        | 'invalid_stamp_page'
        | 'no_catalog'
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

type GuestStampAssignment = {
  guestId: string;
  entryStampDate: string;
  entryStampPage: number | null;
};

async function applyGuestAssignments(
  stayId: string,
  assignments: GuestStampAssignment[]
): Promise<SaveGuestEntryStampDatesActionResult | { ok: true; entryStampDate: string | null }> {
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
      assignment.entryStampDate,
      assignment.entryStampPage
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
  return { ok: true, entryStampDate: first };
}

function buildAssignmentsFromDatesPayload(
  guests: Array<{ id: string }>,
  payload: SaveGuestEntryStampDatesPayload
): GuestStampAssignment[] | null {
  if (payload.mode === 'same') {
    const date = payload.entryStampDate.trim();
    if (!isValidEntryStampDate(date)) {
      return null;
    }
    return guests.map((guest) => ({
      guestId: guest.id,
      entryStampDate: date,
      entryStampPage: payload.stampPages?.[guest.id] ?? null,
    }));
  }

  if (payload.dates.length !== guests.length) {
    return null;
  }

  return payload.dates.map((item) => ({
    guestId: item.guestId,
    entryStampDate: item.entryStampDate.trim(),
    entryStampPage: item.entryStampPage ?? null,
  }));
}

export async function saveGuestEntryDetailsAction(
  tenantSlug: string,
  payload: SaveGuestEntryDetailsPayload
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

    if (payload.intent === 'skip') {
      const stayResult = await setStayEntryDetails(session.stayId, {
        transportType: null,
        entryPointCode: null,
        entryPointLabel: null,
        status: 'skipped',
      });
      if (!stayResult.ok) {
        return { ok: false, error: 'db_unavailable' };
      }
      return { ok: true, entryStampDate: null, entryDetailsStatus: 'skipped' };
    }

    const tourismConfig = resolveTourismRegistrationConfig(tenant.settings);
    const profileId = tourismConfig?.profileId ?? DEFAULT_TOURISM_PROFILE_ID;
    const datesPayload = payload.dates;
    if (!datesPayload) {
      return { ok: false, error: 'invalid_date' };
    }

    const rawAssignments = buildAssignmentsFromDatesPayload(guests, datesPayload);
    if (!rawAssignments) {
      return { ok: false, error: 'invalid_date' };
    }

    const guestIds = new Set(guests.map((guest) => guest.id));
    for (const assignment of rawAssignments) {
      if (!guestIds.has(assignment.guestId)) {
        return { ok: false, error: 'unauthorized' };
      }
    }

    const validated = validateEntryDetailsSave({
      profileId,
      transportType: String(payload.transportType ?? ''),
      entryPointCode: payload.entryPointCode,
      entryPointLabel: payload.entryPointLabel ?? '',
      assignments: rawAssignments,
    });
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }

    const applied = await applyGuestAssignments(session.stayId, validated.value.assignments);
    if (!applied.ok) {
      return applied;
    }

    const stayResult = await setStayEntryDetails(session.stayId, {
      transportType: validated.value.transportType,
      entryPointCode: validated.value.entryPointCode,
      entryPointLabel: validated.value.entryPointLabel,
      status: 'complete',
    });
    if (!stayResult.ok) {
      return { ok: false, error: 'db_unavailable' };
    }

    return {
      ok: true,
      entryStampDate: applied.entryStampDate,
      entryDetailsStatus: 'complete',
    };
  } catch (error) {
    console.error('saveGuestEntryDetailsAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

/** @deprecated Prefer saveGuestEntryDetailsAction. Keeps date-only saves working. */
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
    const assignments = buildAssignmentsFromDatesPayload(guests, payload);
    if (!assignments) {
      return { ok: false, error: 'invalid_date' };
    }
    for (const assignment of assignments) {
      if (!guestIds.has(assignment.guestId)) {
        return { ok: false, error: 'unauthorized' };
      }
    }

    const applied = await applyGuestAssignments(session.stayId, assignments);
    if (!applied.ok) {
      return applied;
    }

    const stayResult = await setStayEntryDetails(session.stayId, {
      transportType: null,
      entryPointCode: null,
      entryPointLabel: null,
      status: 'complete',
    });
    if (!stayResult.ok) {
      return { ok: false, error: 'db_unavailable' };
    }

    return {
      ok: true,
      entryStampDate: applied.entryStampDate,
      entryDetailsStatus: 'complete',
    };
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
    switch (result.error) {
      case 'feature_disabled':
      case 'unauthorized':
      case 'invalid_date':
      case 'no_guests':
      case 'db_unavailable':
      case 'unknown':
        return { ok: false, error: result.error };
      default:
        return { ok: false, error: 'unknown' };
    }
  }
  if (!result.entryStampDate) {
    return { ok: false, error: 'invalid_date' };
  }
  return { ok: true, entryStampDate: result.entryStampDate };
}
