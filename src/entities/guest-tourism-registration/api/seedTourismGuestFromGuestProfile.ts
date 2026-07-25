import 'server-only';

import { randomUUID } from 'crypto';

import { getGuestById, guestProfileToIdentityPrefill, updateGuestIdentity } from '@/entities/guest/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';

import {
  listTourismGuestsByStayId,
  removeGuestDocumentObjectsFromStorage,
} from './guestTourismRegistrationRepository';

/**
 * Delete passport storage objects for a reusable guest profile and clear DB paths.
 * New stays must re-photograph — previous images must not linger.
 */
export async function purgePassportPhotosForGuestProfile(
  guestId: string,
  options?: { exceptStayId?: string }
): Promise<{ removedCount: number }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { removedCount: 0 };
  }

  let query = admin
    .from('guest_stay_tourism_guests')
    .select('id, stay_id, passport_storage_path')
    .eq('guest_id', guestId);

  if (options?.exceptStayId) {
    query = query.neq('stay_id', options.exceptStayId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('purgePassportPhotosForGuestProfile load:', error.message);
    return { removedCount: 0 };
  }

  const rows = data ?? [];
  const paths = rows
    .map((row) => String((row as Record<string, unknown>).passport_storage_path ?? '').trim())
    .filter(Boolean);

  const { removedCount } = await removeGuestDocumentObjectsFromStorage(paths);

  const ids = rows.map((row) => String((row as Record<string, unknown>).id));
  if (ids.length > 0) {
    const { error: clearError } = await admin
      .from('guest_stay_tourism_guests')
      .update({ passport_storage_path: '' })
      .in('id', ids);
    if (clearError) {
      console.error('purgePassportPhotosForGuestProfile clear:', clearError.message);
    }
  }

  return { removedCount };
}

export type SeedTourismGuestFromGuestProfileResult =
  | { ok: true; seeded: boolean }
  | { ok: false; error: 'db_unavailable' };

/**
 * If the linked guest profile has complete identity, create a tourism guest on the stay
 * with empty passport photo path (fresh photo required). Purges prior passport files for the profile.
 */
export async function seedTourismGuestFromGuestProfile(input: {
  tenantId: string;
  stayId: string;
  guestId: string;
}): Promise<SeedTourismGuestFromGuestProfileResult> {
  const existing = await listTourismGuestsByStayId(input.stayId);
  if (existing.length > 0) {
    return { ok: true, seeded: false };
  }

  const profile = await getGuestById(input.tenantId, input.guestId);
  if (!profile) {
    return { ok: true, seeded: false };
  }

  let identity = guestProfileToIdentityPrefill(profile);

  // Fallback: profile may only have display_name while a prior stay holds identity fields.
  if (!identity) {
    const adminForLookup = getSupabaseAdmin();
    if (adminForLookup) {
      const { data: priorRows, error: priorError } = await adminForLookup
        .from('guest_stay_tourism_guests')
        .select(
          'first_name, last_name, citizenship, passport_number, date_of_birth, country_of_birth, place_of_birth, gender, document_type, created_at'
        )
        .eq('guest_id', input.guestId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (priorError) {
        console.error('seedTourismGuestFromGuestProfile prior:', priorError.message);
      } else {
        for (const row of priorRows ?? []) {
          const record = row as Record<string, unknown>;
          const candidate = guestProfileToIdentityPrefill({
            ...profile,
            first_name: String(record.first_name ?? ''),
            last_name: String(record.last_name ?? ''),
            citizenship: String(record.citizenship ?? ''),
            passport_number: String(record.passport_number ?? ''),
            date_of_birth: String(record.date_of_birth ?? '').slice(0, 10),
            country_of_birth: String(record.country_of_birth ?? ''),
            place_of_birth: String(record.place_of_birth ?? ''),
            gender: record.gender === 'female' ? 'female' : record.gender === 'male' ? 'male' : null,
            document_type:
              record.document_type === 'id_card'
                ? 'id_card'
                : record.document_type === 'passport'
                  ? 'passport'
                  : null,
          });
          if (candidate) {
            identity = candidate;
            break;
          }
        }
      }
    }
  }

  if (!identity) {
    return { ok: true, seeded: false };
  }

  // Sync A: keep profile identity complete when we learned it from a prior stay.
  if (!guestProfileToIdentityPrefill(profile)) {
    await updateGuestIdentity({
      tenantId: input.tenantId,
      guestId: input.guestId,
      identity,
    });
  }

  await purgePassportPhotosForGuestProfile(input.guestId);

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const guestRowId = randomUUID();
  const { error } = await admin.from('guest_stay_tourism_guests').insert({
    id: guestRowId,
    stay_id: input.stayId,
    guest_id: input.guestId,
    first_name: identity.firstName,
    last_name: identity.lastName,
    citizenship: identity.citizenship,
    passport_number: identity.passportNumber,
    date_of_birth: identity.dateOfBirth,
    country_of_birth: identity.countryOfBirth,
    place_of_birth: identity.placeOfBirth,
    gender: identity.gender,
    document_type: identity.documentType,
    passport_storage_path: '',
    entry_stamp_storage_path: '',
  });

  if (error) {
    console.error('seedTourismGuestFromGuestProfile insert:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, seeded: true };
}
