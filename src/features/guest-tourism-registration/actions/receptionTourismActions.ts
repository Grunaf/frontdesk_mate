'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';

import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import type {
  GuestTourismGuest,
  GuestTourismRegistrationSummary,
} from '@/entities/guest-tourism-registration';
import {
  isTourismRegistrationComplete,
  parseEntryStampPage,
} from '@/entities/guest-tourism-registration';
import {
  createTourismDocumentSignedUrl,
  getStayTourismCompletionTimestamp,
  getTourismRegistrationByStayId,
  listTourismGuestsByStayId,
  setTourismExportedAt,
  setTourismGuestEntryStampDate,
  updateTourismGuestPassportPath,
  type TourismReceptionDocumentKind,
} from '@/entities/guest-tourism-registration/server';
import { setPassportCheckedAt } from '@/entities/guest-stay/server';
import type { GuestStayRecord } from '@/entities/guest-stay/server';
import {
  resolveTourismRegistrationProfile,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { uploadGuestTourismDocument } from '../api/uploadGuestTourismDocument';
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
  type TourismGuestDocumentType,
  type TourismGuestGender,
} from '../lib/validateTourismGuestIdentity';

const MAX_NAME_LENGTH = 120;

type TourismGuestIdentityInput = {
  firstName: string;
  lastName: string;
  citizenship: string;
  passportNumber: string;
  dateOfBirth: string;
  countryOfBirth: string;
  placeOfBirth: string;
  gender: string;
  documentType: string;
};

type ParsedTourismGuestIdentity = {
  firstName: string;
  lastName: string;
  citizenship: string;
  passportNumber: string;
  dateOfBirth: string;
  countryOfBirth: string;
  placeOfBirth: string;
  gender: TourismGuestGender;
  documentType: TourismGuestDocumentType;
};

function parseTourismGuestIdentityInput(
  input: TourismGuestIdentityInput
): ParsedTourismGuestIdentity | null {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const citizenship = input.citizenship.trim().toUpperCase();
  const dateOfBirth = input.dateOfBirth.trim();
  const countryOfBirth = input.countryOfBirth.trim().toUpperCase();
  const placeOfBirthRaw = input.placeOfBirth;
  const genderRaw = input.gender.trim().toLowerCase();
  const documentTypeRaw = input.documentType.trim().toLowerCase();

  if (!firstName || firstName.length > MAX_NAME_LENGTH) return null;
  if (!lastName || lastName.length > MAX_NAME_LENGTH) return null;
  if (!isValidCitizenship(citizenship)) return null;
  if (!isValidPassportNumber(input.passportNumber)) return null;
  if (!isValidDateOfBirth(dateOfBirth)) return null;
  if (!isValidCountryOfBirth(countryOfBirth)) return null;
  if (!isValidPlaceOfBirth(placeOfBirthRaw)) return null;
  if (!isValidGender(genderRaw)) return null;
  if (!isValidDocumentType(documentTypeRaw)) return null;

  return {
    firstName,
    lastName,
    citizenship,
    passportNumber: normalizePassportNumber(input.passportNumber),
    dateOfBirth,
    countryOfBirth,
    placeOfBirth: normalizePlaceOfBirth(placeOfBirthRaw),
    gender: genderRaw,
    documentType: documentTypeRaw,
  };
}

function mapTourismGuestRow(row: Record<string, unknown>): GuestTourismGuest {
  const citizenship = String(row.citizenship ?? '');
  return {
    id: String(row.id),
    stay_id: String(row.stay_id),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    citizenship,
    passport_number: String(row.passport_number ?? ''),
    date_of_birth: String(row.date_of_birth ?? ''),
    country_of_birth: String(row.country_of_birth ?? citizenship),
    place_of_birth: String(row.place_of_birth ?? ''),
    gender: row.gender === 'female' ? 'female' : 'male',
    document_type: row.document_type === 'id_card' ? 'id_card' : 'passport',
    passport_storage_path: String(row.passport_storage_path ?? ''),
    entry_stamp_storage_path: String(row.entry_stamp_storage_path ?? ''),
    entry_stamp_date:
      row.entry_stamp_date == null || row.entry_stamp_date === ''
        ? null
        : String(row.entry_stamp_date),
    entry_stamp_page: parseEntryStampPage(row.entry_stamp_page),
    created_at: String(row.created_at),
  };
}

const TOURISM_GUEST_SELECT_COLUMNS =
  'id, stay_id, first_name, last_name, citizenship, passport_number, date_of_birth, country_of_birth, place_of_birth, gender, document_type, passport_storage_path, entry_stamp_storage_path, entry_stamp_date, entry_stamp_page, created_at';

async function assertStayOwnedByTenant(
  tenantSlug: string,
  stayId: string
): Promise<'ok' | 'unauthorized' | 'not_found' | 'db_unavailable'> {
  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    return 'not_found';
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return 'db_unavailable';
  }

  const { data, error } = await admin
    .from('guest_reservations')
    .select('id')
    .eq('id', stayId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (error) {
    console.error('assertStayOwnedByTenant:', error.message);
    return 'db_unavailable';
  }

  if (!data) {
    return 'not_found';
  }

  return 'ok';
}

export type SetPassportCheckedActionResult =
  | { ok: true; stay: GuestStayRecord }
  | {
      ok: false;
      error: 'unauthorized' | 'not_found' | 'db_unavailable' | 'unknown';
    };

export async function setPassportCheckedAction(input: {
  tenantSlug: string;
  stayId: string;
  checked: boolean;
  keyIssued?: boolean;
}): Promise<SetPassportCheckedActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const result = await setPassportCheckedAt({
      tenantSlug: input.tenantSlug,
      stayId: input.stayId,
      checked: input.checked,
      keyIssued: input.keyIssued,
    });

    if (!result.ok) {
      return {
        ok: false,
        error:
          result.error === 'tenant_not_found' || result.error === 'not_found'
            ? 'not_found'
            : result.error,
      };
    }

    revalidatePath('/');
    return { ok: true, stay: result.stay };
  } catch (error) {
    console.error('setPassportCheckedAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type SetTourismExportedActionResult =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'not_found' | 'db_unavailable' | 'unknown' };

export async function setTourismExportedAction(input: {
  tenantSlug: string;
  stayId: string;
  exported: boolean;
}): Promise<SetTourismExportedActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const result = await setTourismExportedAt(input.stayId, input.exported);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    console.error('setTourismExportedAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type GetTourismDocumentSignedUrlActionResult =
  | { ok: true; url: string }
  | {
      ok: false;
      error: 'unauthorized' | 'not_found' | 'documents_expired' | 'db_unavailable' | 'unknown';
    };

export async function getTourismDocumentSignedUrlAction(input: {
  tenantSlug: string;
  stayId: string;
  guestId: string;
  kind: TourismReceptionDocumentKind;
}): Promise<GetTourismDocumentSignedUrlActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return { ok: false, error: 'db_unavailable' };
    }

    const { data: guestRow, error: guestError } = await admin
      .from('guest_stay_tourism_guests')
      .select('passport_storage_path, entry_stamp_storage_path')
      .eq('id', input.guestId)
      .eq('stay_id', input.stayId)
      .maybeSingle();

    if (guestError) {
      console.error('getTourismDocumentSignedUrlAction guest:', guestError.message);
      return { ok: false, error: 'db_unavailable' };
    }

    if (!guestRow) {
      const completedAt = await getStayTourismCompletionTimestamp(input.stayId);
      if (completedAt) {
        return { ok: false, error: 'documents_expired' };
      }
      return { ok: false, error: 'not_found' };
    }

    const row = guestRow as Record<string, unknown>;
    const storagePath =
      input.kind === 'passport'
        ? String(row.passport_storage_path ?? '')
        : String(row.entry_stamp_storage_path ?? '');

    if (!storagePath.trim()) {
      const completedAt = await getStayTourismCompletionTimestamp(input.stayId);
      if (completedAt) {
        return { ok: false, error: 'documents_expired' };
      }
      return { ok: false, error: 'not_found' };
    }

    const signed = await createTourismDocumentSignedUrl(storagePath);
    if (!signed.ok) {
      if (signed.error === 'not_found') {
        const completedAt = await getStayTourismCompletionTimestamp(input.stayId);
        if (completedAt) {
          return { ok: false, error: 'documents_expired' };
        }
      }
      return { ok: false, error: signed.error };
    }

    return { ok: true, url: signed.url };
  } catch (error) {
    console.error('getTourismDocumentSignedUrlAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type LoadTourismRegistrationForReceptionActionResult =
  | { ok: true; registration: GuestTourismRegistrationSummary }
  | { ok: false; error: 'unauthorized' | 'not_found' | 'db_unavailable' | 'unknown' };

export async function loadTourismRegistrationForReceptionAction(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<LoadTourismRegistrationForReceptionActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const registration = await getTourismRegistrationByStayId(input.stayId);
    if (!registration) {
      return { ok: false, error: 'not_found' };
    }

    return { ok: true, registration };
  } catch (error) {
    console.error('loadTourismRegistrationForReceptionAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type UploadTourismDocumentForReceptionActionResult =
  | { ok: true; storagePath: string }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'not_found'
        | 'invalid_file'
        | 'db_unavailable'
        | 'upload_failed'
        | 'unknown';
    };

export async function uploadTourismDocumentForReceptionAction(input: {
  tenantSlug: string;
  stayId: string;
  guestId: string;
  formData: FormData;
}): Promise<UploadTourismDocumentForReceptionActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant) {
      return { ok: false, error: 'not_found' };
    }

    const file = input.formData.get('file');
    if (!(file instanceof File)) {
      return { ok: false, error: 'invalid_file' };
    }

    const uploaded = await uploadGuestTourismDocument({
      tenantId: tenant.id,
      stayId: input.stayId,
      guestRowId: input.guestId,
      kind: 'passport',
      file,
    });

    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error };
    }

    const pathUpdate = await updateTourismGuestPassportPath(
      input.stayId,
      input.guestId,
      uploaded.storagePath
    );
    if (!pathUpdate.ok) {
      return { ok: false, error: pathUpdate.error };
    }

    revalidatePath('/');
    return { ok: true, storagePath: uploaded.storagePath };
  } catch (error) {
    console.error('uploadTourismDocumentForReceptionAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type SetTourismGuestEntryStampDateActionResult =
  | { ok: true }
  | {
      ok: false;
      error: 'unauthorized' | 'not_found' | 'invalid_date' | 'db_unavailable' | 'unknown';
    };

export async function setTourismGuestEntryStampDateAction(input: {
  tenantSlug: string;
  stayId: string;
  guestId: string;
  entryStampDate: string | null;
}): Promise<SetTourismGuestEntryStampDateActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const result = await setTourismGuestEntryStampDate(
      input.stayId,
      input.guestId,
      input.entryStampDate
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    revalidatePath('/');
    return { ok: true };
  } catch (error) {
    console.error('setTourismGuestEntryStampDateAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type CreateTourismGuestForReceptionActionResult =
  | { ok: true; guest: GuestTourismGuest }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'not_found'
        | 'feature_disabled'
        | 'registration_closed'
        | 'invalid_input'
        | 'db_unavailable'
        | 'unknown';
    };

export async function createTourismGuestForReceptionAction(input: {
  tenantSlug: string;
  stayId: string;
  identity: TourismGuestIdentityInput;
}): Promise<CreateTourismGuestForReceptionActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    const profile = tenant ? resolveTourismRegistrationProfile(tenant.settings) : undefined;
    if (!tenant || !profile) {
      return { ok: false, error: 'feature_disabled' };
    }

    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const registration = await getTourismRegistrationByStayId(input.stayId);
    if (registration?.tourism_registration_completed_at) {
      return { ok: false, error: 'registration_closed' };
    }

    const identity = parseTourismGuestIdentityInput(input.identity);
    if (!identity) {
      return { ok: false, error: 'invalid_input' };
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return { ok: false, error: 'db_unavailable' };
    }

    const guestRowId = randomUUID();
    const { data, error } = await admin
      .from('guest_stay_tourism_guests')
      .insert({
        id: guestRowId,
        stay_id: input.stayId,
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
      })
      .select(TOURISM_GUEST_SELECT_COLUMNS)
      .single();

    if (error || !data) {
      console.error('createTourismGuestForReceptionAction insert:', error?.message);
      return { ok: false, error: 'db_unavailable' };
    }

    revalidatePath('/');
    return {
      ok: true,
      guest: mapTourismGuestRow(data as Record<string, unknown>),
    };
  } catch (error) {
    console.error('createTourismGuestForReceptionAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type UpdateTourismGuestIdentityForReceptionActionResult =
  | { ok: true; guest: GuestTourismGuest }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'not_found'
        | 'feature_disabled'
        | 'invalid_input'
        | 'db_unavailable'
        | 'unknown';
    };

export async function updateTourismGuestIdentityForReceptionAction(input: {
  tenantSlug: string;
  stayId: string;
  guestId: string;
  identity: TourismGuestIdentityInput;
}): Promise<UpdateTourismGuestIdentityForReceptionActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant || !resolveTourismRegistrationRequired(tenant.settings)) {
      return { ok: false, error: 'feature_disabled' };
    }

    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const identity = parseTourismGuestIdentityInput(input.identity);
    if (!identity) {
      return { ok: false, error: 'invalid_input' };
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return { ok: false, error: 'db_unavailable' };
    }

    const { data, error } = await admin
      .from('guest_stay_tourism_guests')
      .update({
        first_name: identity.firstName,
        last_name: identity.lastName,
        citizenship: identity.citizenship,
        passport_number: identity.passportNumber,
        date_of_birth: identity.dateOfBirth,
        country_of_birth: identity.countryOfBirth,
        place_of_birth: identity.placeOfBirth,
        gender: identity.gender,
        document_type: identity.documentType,
      })
      .eq('id', input.guestId)
      .eq('stay_id', input.stayId)
      .select(TOURISM_GUEST_SELECT_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error('updateTourismGuestIdentityForReceptionAction:', error.message);
      return { ok: false, error: 'db_unavailable' };
    }

    if (!data) {
      return { ok: false, error: 'not_found' };
    }

    revalidatePath('/');
    return {
      ok: true,
      guest: mapTourismGuestRow(data as Record<string, unknown>),
    };
  } catch (error) {
    console.error('updateTourismGuestIdentityForReceptionAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export type CompleteTourismRegistrationForReceptionActionResult =
  | { ok: true; alreadyComplete?: boolean; completedAt: string }
  | {
      ok: false;
      error:
        | 'unauthorized'
        | 'not_found'
        | 'feature_disabled'
        | 'no_guests'
        | 'db_unavailable'
        | 'unknown';
    };

export async function completeTourismRegistrationForReceptionAction(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<CompleteTourismRegistrationForReceptionActionResult> {
  try {
    await assertReceptionAuthenticated(input.tenantSlug);
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  try {
    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant || !resolveTourismRegistrationRequired(tenant.settings)) {
      return { ok: false, error: 'feature_disabled' };
    }

    const ownership = await assertStayOwnedByTenant(input.tenantSlug, input.stayId);
    if (ownership !== 'ok') {
      return {
        ok: false,
        error: ownership === 'unauthorized' ? 'unauthorized' : ownership,
      };
    }

    const registration = await getTourismRegistrationByStayId(input.stayId);
    if (registration && isTourismRegistrationComplete(registration)) {
      return {
        ok: true,
        alreadyComplete: true,
        completedAt: registration.tourism_registration_completed_at!,
      };
    }

    const guests = await listTourismGuestsByStayId(input.stayId);
    if (guests.length < 1) {
      return { ok: false, error: 'no_guests' };
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return { ok: false, error: 'db_unavailable' };
    }

    const completedAt = new Date().toISOString();
    const { data, error } = await admin
      .from('guest_reservations')
      .update({
        tourism_registration_completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', input.stayId)
      .is('tourism_registration_completed_at', null)
      .select('id, tourism_registration_completed_at')
      .maybeSingle();

    if (error) {
      console.error('completeTourismRegistrationForReceptionAction:', error.message);
      return { ok: false, error: 'db_unavailable' };
    }

    if (!data) {
      const latest = await getTourismRegistrationByStayId(input.stayId);
      if (latest && isTourismRegistrationComplete(latest)) {
        return {
          ok: true,
          alreadyComplete: true,
          completedAt: latest.tourism_registration_completed_at!,
        };
      }
      return { ok: false, error: 'db_unavailable' };
    }

    revalidatePath('/');
    return {
      ok: true,
      completedAt: String(
        (data as { tourism_registration_completed_at?: string }).tourism_registration_completed_at ??
          completedAt
      ),
    };
  } catch (error) {
    console.error('completeTourismRegistrationForReceptionAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
