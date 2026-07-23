'use server';

import { randomUUID } from 'crypto';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationProfile } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import {
  isValidCitizenship,
  isValidCountryOfBirth,
  isValidDateOfBirth,
  isValidDocumentType,
  isValidGender,
  isValidPassportNumber,
  isValidPlaceOfBirth,
  normalizePassportNumber,
  normalizePlaceOfBirth,
} from '../lib/validateTourismGuestIdentity';

const MAX_NAME_LENGTH = 120;

export type SubmitTourismGuestActionResult =
  | { ok: true; guest: { id: string; firstName: string; lastName: string } }
  | {
      ok: false;
      error:
        | 'feature_disabled'
        | 'unauthorized'
        | 'registration_closed'
        | 'invalid_input'
        | 'db_unavailable';
    };

function readGuestNamePart(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw || raw.length > MAX_NAME_LENGTH) {
    return null;
  }
  return raw;
}

export async function submitTourismGuestAction(
  tenantSlug: string,
  formData: FormData
): Promise<SubmitTourismGuestActionResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'unauthorized' };
  }

  const tenant = await getTenantRecord(slug);
  const profile = tenant ? resolveTourismRegistrationProfile(tenant.settings) : undefined;
  if (!tenant || !profile) {
    return { ok: false, error: 'feature_disabled' };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session) {
    return { ok: false, error: 'unauthorized' };
  }

  const registration = await getTourismRegistrationByStayId(session.stayId);
  if (registration?.tourism_registration_completed_at) {
    return { ok: false, error: 'registration_closed' };
  }

  const firstName = readGuestNamePart(formData, 'firstName');
  const lastName = readGuestNamePart(formData, 'lastName');
  const citizenshipRaw = String(formData.get('citizenship') ?? '').trim().toUpperCase();
  const passportNumberRaw = String(formData.get('passportNumber') ?? '');
  const dateOfBirth = String(formData.get('dateOfBirth') ?? '').trim();
  const countryOfBirthRaw = String(formData.get('countryOfBirth') ?? '').trim().toUpperCase();
  const placeOfBirthRaw = String(formData.get('placeOfBirth') ?? '');
  const genderRaw = String(formData.get('gender') ?? '').trim().toLowerCase();
  const documentTypeRaw = String(formData.get('documentType') ?? '').trim().toLowerCase();

  if (!firstName || !lastName) {
    return { ok: false, error: 'invalid_input' };
  }
  if (!isValidCitizenship(citizenshipRaw)) {
    return { ok: false, error: 'invalid_input' };
  }
  if (!isValidPassportNumber(passportNumberRaw)) {
    return { ok: false, error: 'invalid_input' };
  }
  if (!isValidDateOfBirth(dateOfBirth)) {
    return { ok: false, error: 'invalid_input' };
  }
  if (!isValidCountryOfBirth(countryOfBirthRaw)) {
    return { ok: false, error: 'invalid_input' };
  }
  if (!isValidPlaceOfBirth(placeOfBirthRaw)) {
    return { ok: false, error: 'invalid_input' };
  }
  if (!isValidGender(genderRaw)) {
    return { ok: false, error: 'invalid_input' };
  }
  if (!isValidDocumentType(documentTypeRaw)) {
    return { ok: false, error: 'invalid_input' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const guestRowId = randomUUID();
  const passportNumber = normalizePassportNumber(passportNumberRaw);
  const placeOfBirth = normalizePlaceOfBirth(placeOfBirthRaw);

  const { data, error } = await admin
    .from('guest_stay_tourism_guests')
    .insert({
      id: guestRowId,
      stay_id: session.stayId,
      first_name: firstName,
      last_name: lastName,
      citizenship: citizenshipRaw,
      passport_number: passportNumber,
      date_of_birth: dateOfBirth,
      country_of_birth: countryOfBirthRaw,
      place_of_birth: placeOfBirth,
      gender: genderRaw,
      document_type: documentTypeRaw,
      passport_storage_path: '',
      entry_stamp_storage_path: '',
    })
    .select('id, first_name, last_name')
    .single();

  if (error || !data) {
    console.error('submitTourismGuestAction insert:', error?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return {
    ok: true,
    guest: {
      id: String(data.id),
      firstName: String(data.first_name),
      lastName: String(data.last_name),
    },
  };
}
