import 'server-only';

import { createGuestStay, cancelOrCheckoutGuestReservation, listPlanGuestReservations } from '@/entities/guest-stay/server';
import {
  createReceptionUser,
  disableReceptionUser,
  listReceptionUsersByTenant,
} from '@/entities/reception-user/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { getTenantRecord } from '@/entities/tenant/server';

import {
  buildVolunteerStaffLoginBase,
  buildVolunteerStaffLoginCandidate,
  generateVolunteerStaffPin,
} from '../lib/volunteerStaffCredentials';
import type {
  ArchiveVolunteerStayInput,
  ArchiveVolunteerStayResult,
  CreateVolunteerStayInput,
  CreateVolunteerStayResult,
  VolunteerListItem,
  VolunteerRecord,
  VolunteerSource,
} from '../model/types';

/** Keep in sync with reception-staff-management MAX_ACTIVE_RECEPTION_STAFF. */
const MAX_ACTIVE_RECEPTION_STAFF = 20;
const VOLUNTEER_COLUMNS =
  'id, tenant_id, reservation_id, reception_user_id, display_name, source, is_archived, archived_at, archived_by_owner_user_id, created_at, updated_at';

function isVolunteerSource(value: string): value is VolunteerSource {
  return value === 'direct' || value === 'worldpacker';
}

function mapVolunteerRow(row: Record<string, unknown>): VolunteerRecord | null {
  const source = row.source ? String(row.source) : '';
  if (!isVolunteerSource(source)) return null;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    reservation_id: String(row.reservation_id),
    reception_user_id: row.reception_user_id ? String(row.reception_user_id) : null,
    display_name: String(row.display_name),
    source,
    is_archived: Boolean(row.is_archived),
    archived_at: row.archived_at ? String(row.archived_at) : null,
    archived_by_owner_user_id: row.archived_by_owner_user_id
      ? String(row.archived_by_owner_user_id)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function rollbackVolunteerReservation(input: {
  tenantSlug: string;
  stayId: string;
  operationalDate: string;
}) {
  await cancelOrCheckoutGuestReservation({
    tenantSlug: input.tenantSlug,
    stayId: input.stayId,
    operationalDate: input.operationalDate,
    archivedByReceptionUserId: '',
    intent: 'cancel',
  });
}

async function createStaffAccountForVolunteer(input: {
  tenantSlug: string;
  displayName: string;
}): Promise<
  | { ok: true; userId: string; login: string; pin: string }
  | { ok: false; error: 'staff_limit_reached' | 'login_taken' | 'db_unavailable' }
> {
  const existing = await listReceptionUsersByTenant(input.tenantSlug);
  const activeCount = existing.filter((user) => !user.disabled_at).length;
  if (activeCount >= MAX_ACTIVE_RECEPTION_STAFF) {
    return { ok: false, error: 'staff_limit_reached' };
  }

  const base = buildVolunteerStaffLoginBase(input.displayName);
  const pin = generateVolunteerStaffPin();

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const login = buildVolunteerStaffLoginCandidate(base, attempt);
    const result = await createReceptionUser({
      tenantSlug: input.tenantSlug,
      login,
      displayName: input.displayName,
      pin,
      permissions: [],
    });
    if (result.ok) {
      return { ok: true, userId: result.user.id, login: result.user.login, pin };
    }
    if (result.error === 'login_taken') {
      continue;
    }
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: false, error: 'login_taken' };
}

export async function createVolunteerStay(
  input: CreateVolunteerStayInput
): Promise<CreateVolunteerStayResult> {
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false, error: 'invalid_name' };
  }
  if (!isVolunteerSource(input.source)) {
    return { ok: false, error: 'invalid_source' };
  }

  const staffProbe = await listReceptionUsersByTenant(input.tenantSlug);
  const activeCount = staffProbe.filter((user) => !user.disabled_at).length;
  if (activeCount >= MAX_ACTIVE_RECEPTION_STAFF) {
    return { ok: false, error: 'staff_limit_reached' };
  }

  const locale = input.locale ?? 'en';
  const stayResult = await createGuestStay(
    {
      tenantSlug: input.tenantSlug,
      bedId: input.bedId,
      guestName: displayName,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      stayKind: 'volunteer',
    },
    locale
  );

  if (!stayResult.ok) {
    if (
      stayResult.error === 'tenant_not_found' ||
      stayResult.error === 'bed_not_found' ||
      stayResult.error === 'access_overlap' ||
      stayResult.error === 'db_unavailable'
    ) {
      return { ok: false, error: stayResult.error };
    }
    return { ok: false, error: 'db_unavailable' };
  }

  const staffResult = await createStaffAccountForVolunteer({
    tenantSlug: input.tenantSlug,
    displayName,
  });

  if (!staffResult.ok) {
    await rollbackVolunteerReservation({
      tenantSlug: input.tenantSlug,
      stayId: stayResult.stay.id,
      operationalDate: input.checkInDate,
    });
    return { ok: false, error: staffResult.error };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    await disableReceptionUser({
      tenantSlug: input.tenantSlug,
      userId: staffResult.userId,
    });
    await rollbackVolunteerReservation({
      tenantSlug: input.tenantSlug,
      stayId: stayResult.stay.id,
      operationalDate: input.checkInDate,
    });
    return { ok: false, error: 'db_unavailable' };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from('volunteers')
    .insert({
      tenant_id: stayResult.stay.tenant_id,
      reservation_id: stayResult.stay.id,
      reception_user_id: staffResult.userId,
      display_name: displayName,
      source: input.source,
      is_archived: false,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(VOLUNTEER_COLUMNS)
    .single();

  if (error || !data) {
    console.error('createVolunteerStay volunteer insert:', error?.message);
    await disableReceptionUser({
      tenantSlug: input.tenantSlug,
      userId: staffResult.userId,
    });
    await rollbackVolunteerReservation({
      tenantSlug: input.tenantSlug,
      stayId: stayResult.stay.id,
      operationalDate: input.checkInDate,
    });
    return { ok: false, error: 'db_unavailable' };
  }

  const volunteer = mapVolunteerRow(data as Record<string, unknown>);
  if (!volunteer) {
    return { ok: false, error: 'db_unavailable' };
  }

  return {
    ok: true,
    volunteer,
    stayId: stayResult.stay.id,
    accessToken: stayResult.accessToken,
    magicLinkUrl: stayResult.magicLinkUrl,
    guestPin: stayResult.guestPin,
    staffLogin: staffResult.login,
    staffPin: staffResult.pin,
  };
}

export async function listActiveVolunteers(
  tenantSlug: string,
  locale = 'en'
): Promise<VolunteerListItem[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  const { data, error } = await admin
    .from('volunteers')
    .select(VOLUNTEER_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listActiveVolunteers:', error.message);
    return [];
  }

  const planStays = await listPlanGuestReservations(tenantSlug, locale);
  const stayById = new Map(planStays.map((stay) => [stay.id, stay]));
  const staffUsers = await listReceptionUsersByTenant(tenantSlug);
  const loginById = new Map(staffUsers.map((user) => [user.id, user.login]));

  const items: VolunteerListItem[] = [];
  for (const row of data ?? []) {
    const volunteer = mapVolunteerRow(row as Record<string, unknown>);
    if (!volunteer) continue;
    const stay = stayById.get(volunteer.reservation_id);
    if (!stay || stay.stay_kind !== 'volunteer') continue;
    items.push({
      ...volunteer,
      bed_id: stay.bed_id,
      check_in_date: stay.check_in_date,
      check_out_date: stay.check_out_date,
      staff_login: volunteer.reception_user_id
        ? (loginById.get(volunteer.reception_user_id) ?? null)
        : null,
      guest_pin: null,
      magic_link_url: stay.magicLinkUrl,
    });
  }

  return items;
}

export async function archiveVolunteerStay(
  input: ArchiveVolunteerStayInput
): Promise<ArchiveVolunteerStayResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'tenant_not_found' };

  const { data: row, error: loadError } = await admin
    .from('volunteers')
    .select(VOLUNTEER_COLUMNS)
    .eq('id', input.volunteerId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (loadError) {
    console.error('archiveVolunteerStay load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!row) return { ok: false, error: 'not_found' };

  const volunteer = mapVolunteerRow(row as Record<string, unknown>);
  if (!volunteer) return { ok: false, error: 'db_unavailable' };
  if (volunteer.is_archived) return { ok: false, error: 'already_archived' };

  const cancelResult = await cancelOrCheckoutGuestReservation({
    tenantSlug: input.tenantSlug,
    stayId: volunteer.reservation_id,
    operationalDate: input.operationalDate,
    archivedByReceptionUserId: '',
    intent: 'cancel',
  });

  if (!cancelResult.ok) {
    if (
      cancelResult.error === 'already_archived' ||
      cancelResult.error === 'not_found' ||
      cancelResult.error === 'invalid_operational_day' ||
      cancelResult.error === 'db_unavailable'
    ) {
      return { ok: false, error: cancelResult.error };
    }
    return { ok: false, error: 'db_unavailable' };
  }

  if (volunteer.reception_user_id) {
    const disableResult = await disableReceptionUser({
      tenantSlug: input.tenantSlug,
      userId: volunteer.reception_user_id,
    });
    if (
      !disableResult.ok &&
      disableResult.error !== 'already_disabled' &&
      disableResult.error !== 'user_not_found'
    ) {
      console.error('archiveVolunteerStay disable staff:', disableResult.error);
      return { ok: false, error: 'db_unavailable' };
    }
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from('volunteers')
    .update({
      is_archived: true,
      archived_at: nowIso,
      archived_by_owner_user_id: input.ownerUserId,
      updated_at: nowIso,
    })
    .eq('id', volunteer.id)
    .eq('tenant_id', tenant.id);

  if (updateError) {
    console.error('archiveVolunteerStay update:', updateError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true };
}
