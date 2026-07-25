import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';

import { formatGuestDisplayName } from '../lib/formatGuestDisplayName';
import type {
  CreateGuestProfileInput,
  CreateGuestProfileResult,
  GuestDocumentType,
  GuestGender,
  GuestIdentityFields,
  GuestProfile,
  SearchGuestsInput,
  SearchGuestsResult,
  UpdateGuestIdentityInput,
  UpdateGuestIdentityResult,
} from '../model/types';

const GUEST_COLUMNS =
  'id, tenant_id, display_name, contact_whatsapp, notes, first_name, last_name, citizenship, passport_number, date_of_birth, country_of_birth, place_of_birth, gender, document_type, created_at, updated_at';

const DEFAULT_SEARCH_LIMIT = 12;
const MAX_SEARCH_LIMIT = 30;

function mapGender(value: unknown): GuestGender | null {
  if (value === 'male' || value === 'female') return value;
  return null;
}

function mapDocumentType(value: unknown): GuestDocumentType | null {
  if (value === 'passport' || value === 'id_card') return value;
  return null;
}

function mapGuestRow(row: Record<string, unknown>): GuestProfile {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    display_name: String(row.display_name ?? ''),
    contact_whatsapp: row.contact_whatsapp ? String(row.contact_whatsapp) : null,
    notes: row.notes ? String(row.notes) : null,
    first_name: row.first_name ? String(row.first_name) : null,
    last_name: row.last_name ? String(row.last_name) : null,
    citizenship: row.citizenship ? String(row.citizenship) : null,
    passport_number: row.passport_number ? String(row.passport_number) : null,
    date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : null,
    country_of_birth: row.country_of_birth ? String(row.country_of_birth) : null,
    place_of_birth: row.place_of_birth ? String(row.place_of_birth) : null,
    gender: mapGender(row.gender),
    document_type: mapDocumentType(row.document_type),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function identityInsertPatch(identity: Partial<GuestIdentityFields> | null | undefined) {
  if (!identity) return {};
  return {
    ...(identity.firstName !== undefined ? { first_name: identity.firstName.trim() || null } : {}),
    ...(identity.lastName !== undefined ? { last_name: identity.lastName.trim() || null } : {}),
    ...(identity.citizenship !== undefined
      ? { citizenship: identity.citizenship.trim().toUpperCase() || null }
      : {}),
    ...(identity.passportNumber !== undefined
      ? { passport_number: identity.passportNumber.trim() || null }
      : {}),
    ...(identity.dateOfBirth !== undefined
      ? { date_of_birth: identity.dateOfBirth.trim() || null }
      : {}),
    ...(identity.countryOfBirth !== undefined
      ? { country_of_birth: identity.countryOfBirth.trim().toUpperCase() || null }
      : {}),
    ...(identity.placeOfBirth !== undefined
      ? { place_of_birth: identity.placeOfBirth.trim() || null }
      : {}),
    ...(identity.gender !== undefined ? { gender: identity.gender } : {}),
    ...(identity.documentType !== undefined ? { document_type: identity.documentType } : {}),
  };
}

export async function createGuestProfile(
  input: CreateGuestProfileInput
): Promise<CreateGuestProfileResult> {
  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false, error: 'invalid_input' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from('guests')
    .insert({
      tenant_id: input.tenantId,
      display_name: displayName,
      contact_whatsapp: input.contactWhatsapp?.trim() || null,
      notes: input.notes?.trim() || null,
      ...identityInsertPatch(input.identity),
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(GUEST_COLUMNS)
    .single();

  if (error || !data) {
    console.error('createGuestProfile:', error?.message ?? 'no data');
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, guest: mapGuestRow(data as Record<string, unknown>) };
}

export async function getGuestById(
  tenantId: string,
  guestId: string
): Promise<GuestProfile | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('guests')
    .select(GUEST_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('id', guestId)
    .maybeSingle();

  if (error) {
    console.error('getGuestById:', error.message);
    return null;
  }
  if (!data) return null;
  return mapGuestRow(data as Record<string, unknown>);
}

export async function searchGuests(input: SearchGuestsInput): Promise<SearchGuestsResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const query = input.query.trim();
  const limit = Math.min(
    Math.max(1, input.limit ?? DEFAULT_SEARCH_LIMIT),
    MAX_SEARCH_LIMIT
  );

  let request = admin
    .from('guests')
    .select(GUEST_COLUMNS)
    .eq('tenant_id', input.tenantId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (query.length > 0) {
    const escaped = query.replace(/[%_,()"]/g, '');
    if (escaped.length > 0) {
      const pattern = `"%${escaped}%"`;
      request = request.or(
        `display_name.ilike.${pattern},passport_number.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`
      );
    }
  }

  const { data, error } = await request;
  if (error) {
    console.error('searchGuests:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return {
    ok: true,
    items: (data ?? []).map((row) => mapGuestRow(row as Record<string, unknown>)),
  };
}

export async function updateGuestIdentity(
  input: UpdateGuestIdentityInput
): Promise<UpdateGuestIdentityResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const identity = input.identity;
  const displayName =
    input.displayName?.trim() ||
    formatGuestDisplayName(identity.firstName, identity.lastName);

  const { data, error } = await admin
    .from('guests')
    .update({
      display_name: displayName,
      first_name: identity.firstName.trim(),
      last_name: identity.lastName.trim(),
      citizenship: identity.citizenship.trim().toUpperCase(),
      passport_number: identity.passportNumber.trim(),
      date_of_birth: identity.dateOfBirth.trim(),
      country_of_birth: identity.countryOfBirth.trim().toUpperCase(),
      place_of_birth: identity.placeOfBirth.trim(),
      gender: identity.gender,
      document_type: identity.documentType,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.guestId)
    .select(GUEST_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('updateGuestIdentity:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true, guest: mapGuestRow(data as Record<string, unknown>) };
}

/** Resolve existing guest or create a name-only profile for a new booking. */
export async function resolveGuestIdForBooking(input: {
  tenantId: string;
  guestId?: string | null;
  guestName?: string | null;
}): Promise<{ ok: true; guestId: string; displayName: string } | { ok: false; error: 'invalid_input' | 'not_found' | 'db_unavailable' }> {
  const displayName = input.guestName?.trim() || 'Guest';

  if (input.guestId) {
    const existing = await getGuestById(input.tenantId, input.guestId);
    if (!existing) {
      return { ok: false, error: 'not_found' };
    }
    if (input.guestName?.trim() && input.guestName.trim() !== existing.display_name) {
      const admin = getSupabaseAdmin();
      if (!admin) return { ok: false, error: 'db_unavailable' };
      await admin
        .from('guests')
        .update({
          display_name: input.guestName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('tenant_id', input.tenantId);
      return { ok: true, guestId: existing.id, displayName: input.guestName.trim() };
    }
    return { ok: true, guestId: existing.id, displayName: existing.display_name };
  }

  const created = await createGuestProfile({
    tenantId: input.tenantId,
    displayName,
  });
  if (!created.ok) {
    return { ok: false, error: created.error === 'invalid_input' ? 'invalid_input' : 'db_unavailable' };
  }
  return { ok: true, guestId: created.guest.id, displayName: created.guest.display_name };
}
