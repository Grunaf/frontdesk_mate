import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import {
  isEntryDetailsStatus,
  isEntryTransportType,
  parseEntryStampPage,
} from '../lib/isEntryDateComplete';
import { isTourismRegistrationComplete as isTourismRegistrationCompleteSummary } from '../lib/isTourismRegistrationComplete';
import type {
  EntryDetailsStatus,
  EntryTransportType,
  GuestTourismGuest,
  GuestTourismRegistrationSummary,
} from '../model/types';

const GUEST_DOCUMENTS_BUCKET = 'guest-documents';

const SIGNED_URL_TTL_SECONDS = 10 * 60;

const STAY_TOURISM_COLUMNS =
  'tourism_contact_whatsapp, tourism_registration_completed_at, tourism_exported_at, entry_transport_type, entry_point_code, entry_point_label, entry_details_status';

const GUEST_TOURISM_COLUMNS =
  'id, stay_id, first_name, last_name, citizenship, passport_number, date_of_birth, country_of_birth, place_of_birth, gender, document_type, passport_storage_path, entry_stamp_storage_path, entry_stamp_date, entry_stamp_page, created_at';

function mapEntryTransportType(value: unknown): EntryTransportType | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return isEntryTransportType(trimmed) ? trimmed : null;
}

function mapEntryDetailsStatus(value: unknown): EntryDetailsStatus | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return isEntryDetailsStatus(trimmed) ? trimmed : null;
}

function mapGuestRow(row: Record<string, unknown>): GuestTourismGuest {
  const gender = row.gender === 'female' ? 'female' : 'male';
  const documentType = row.document_type === 'id_card' ? 'id_card' : 'passport';
  const citizenship = String(row.citizenship ?? '');
  return {
    id: String(row.id),
    stay_id: String(row.stay_id),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    citizenship,
    passport_number: String(row.passport_number),
    date_of_birth: String(row.date_of_birth),
    country_of_birth: String(row.country_of_birth ?? citizenship),
    place_of_birth: String(row.place_of_birth ?? ''),
    gender,
    document_type: documentType,
    passport_storage_path: String(row.passport_storage_path),
    entry_stamp_storage_path: String(row.entry_stamp_storage_path),
    entry_stamp_date: row.entry_stamp_date ? String(row.entry_stamp_date) : null,
    entry_stamp_page: parseEntryStampPage(row.entry_stamp_page),
    created_at: String(row.created_at),
  };
}

export async function listTourismGuestsByStayId(stayId: string): Promise<GuestTourismGuest[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('guest_stay_tourism_guests')
    .select(GUEST_TOURISM_COLUMNS)
    .eq('stay_id', stayId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('listTourismGuestsByStayId:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapGuestRow(row as Record<string, unknown>));
}

export async function getTourismRegistrationByStayId(
  stayId: string
): Promise<GuestTourismRegistrationSummary | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: stayRow, error: stayError } = await admin
    .from('guest_reservations')
    .select(STAY_TOURISM_COLUMNS)
    .eq('id', stayId)
    .maybeSingle();

  if (stayError) {
    console.error('getTourismRegistrationByStayId stay:', stayError.message);
    return null;
  }

  if (!stayRow) return null;

  const guests = await listTourismGuestsByStayId(stayId);

  const row = stayRow as Record<string, unknown>;

  return {
    stay_id: stayId,
    tourism_contact_whatsapp: row.tourism_contact_whatsapp
      ? String(row.tourism_contact_whatsapp)
      : null,
    tourism_registration_completed_at: row.tourism_registration_completed_at
      ? String(row.tourism_registration_completed_at)
      : null,
    tourism_exported_at: row.tourism_exported_at ? String(row.tourism_exported_at) : null,
    entry_transport_type: mapEntryTransportType(row.entry_transport_type),
    entry_point_code: row.entry_point_code ? String(row.entry_point_code) : null,
    entry_point_label: row.entry_point_label ? String(row.entry_point_label) : null,
    entry_details_status: mapEntryDetailsStatus(row.entry_details_status),
    guests,
  };
}

export async function isTourismRegistrationComplete(
  stayId: string
): Promise<boolean> {
  const summary = await getTourismRegistrationByStayId(stayId);
  if (!summary) return false;
  return isTourismRegistrationCompleteSummary(summary);
}

export type SetTourismExportedAtResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'db_unavailable' };

export async function setTourismExportedAt(
  stayId: string,
  exported: boolean
): Promise<SetTourismExportedAtResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data, error } = await admin
    .from('guest_reservations')
    .update({
      tourism_exported_at: exported ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stayId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('setTourismExportedAt:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}

export type UpdateTourismGuestPassportPathResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'db_unavailable' };

export async function updateTourismGuestPassportPath(
  stayId: string,
  guestId: string,
  passportStoragePath: string
): Promise<UpdateTourismGuestPassportPathResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data, error } = await admin
    .from('guest_stay_tourism_guests')
    .update({ passport_storage_path: passportStoragePath })
    .eq('id', guestId)
    .eq('stay_id', stayId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('updateTourismGuestPassportPath:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}

export type SetTourismGuestEntryStampDateResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'db_unavailable' | 'invalid_date' };

const ENTRY_STAMP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function setTourismGuestEntryStampDate(
  stayId: string,
  guestId: string,
  entryStampDate: string | null,
  entryStampPage?: number | null
): Promise<SetTourismGuestEntryStampDateResult> {
  if (entryStampDate != null && !ENTRY_STAMP_DATE_RE.test(entryStampDate)) {
    return { ok: false, error: 'invalid_date' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const patch: Record<string, unknown> = {
    entry_stamp_date: entryStampDate,
    // Reception collects a date, not a photo — keep storage path empty.
    entry_stamp_storage_path: '',
  };
  if (entryStampPage !== undefined) {
    patch.entry_stamp_page = entryStampPage;
  }

  const { data, error } = await admin
    .from('guest_stay_tourism_guests')
    .update(patch)
    .eq('id', guestId)
    .eq('stay_id', stayId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('setTourismGuestEntryStampDate:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}

export type StayEntryDetailsPatch = {
  transportType: EntryTransportType | null;
  entryPointCode: string | null;
  entryPointLabel: string | null;
  status: EntryDetailsStatus;
};

export type SetStayEntryDetailsResult =
  | { ok: true }
  | { ok: false; error: 'not_found' | 'db_unavailable' };

export async function setStayEntryDetails(
  stayId: string,
  patch: StayEntryDetailsPatch
): Promise<SetStayEntryDetailsResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data, error } = await admin
    .from('guest_reservations')
    .update({
      entry_transport_type: patch.transportType,
      entry_point_code: patch.entryPointCode,
      entry_point_label: patch.entryPointLabel,
      entry_details_status: patch.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stayId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('setStayEntryDetails:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}

export type TourismReceptionDocumentKind = 'passport' | 'entry_stamp';

export type CreateTourismDocumentSignedUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: 'not_found' | 'db_unavailable' };

export async function createTourismDocumentSignedUrl(
  storagePath: string
): Promise<CreateTourismDocumentSignedUrlResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const trimmed = storagePath.trim();
  if (!trimmed) {
    return { ok: false, error: 'not_found' };
  }

  const { data, error } = await admin.storage
    .from(GUEST_DOCUMENTS_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error('createTourismDocumentSignedUrl:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data?.signedUrl) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true, url: data.signedUrl };
}

export type TourismStayEligibleForPurge = {
  stay_id: string;
  tenant_id: string;
  check_out_at: string;
};

export async function listStaysWithTourismGuestsPastCheckOut(
  checkOutOnOrBeforeIso: string,
  limit: number
): Promise<TourismStayEligibleForPurge[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const safeLimit = Math.max(1, Math.min(limit, 500));

  const { data, error } = await admin
    .from('guest_reservations')
    .select('id, tenant_id, check_out_at, guest_stay_tourism_guests!inner(id)')
    .lte('check_out_at', checkOutOnOrBeforeIso)
    .limit(safeLimit);

  if (error) {
    console.error('listStaysWithTourismGuestsPastCheckOut:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      stay_id: String(record.id),
      tenant_id: String(record.tenant_id),
      check_out_at: String(record.check_out_at),
    };
  });
}

export async function removeGuestDocumentObjectsFromStorage(
  storagePaths: string[]
): Promise<{ removedCount: number }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { removedCount: 0 };
  }

  const uniquePaths = [...new Set(storagePaths.map((path) => path.trim()).filter(Boolean))];
  if (uniquePaths.length === 0) {
    return { removedCount: 0 };
  }

  const { data, error } = await admin.storage.from(GUEST_DOCUMENTS_BUCKET).remove(uniquePaths);

  if (error) {
    console.error('removeGuestDocumentObjectsFromStorage:', error.message);
    return { removedCount: 0 };
  }

  return { removedCount: data?.length ?? uniquePaths.length };
}

export async function deleteTourismGuestsByStayId(stayId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin.from('guest_stay_tourism_guests').delete().eq('stay_id', stayId);

  if (error) {
    console.error('deleteTourismGuestsByStayId:', error.message);
    return false;
  }

  return true;
}

export async function clearTourismContactWhatsappForStay(stayId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from('guest_reservations')
    .update({
      tourism_contact_whatsapp: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stayId);

  if (error) {
    console.error('clearTourismContactWhatsappForStay:', error.message);
    return false;
  }

  return true;
}

export async function getStayTourismCompletionTimestamp(
  stayId: string
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('guest_reservations')
    .select('tourism_registration_completed_at')
    .eq('id', stayId)
    .maybeSingle();

  if (error) {
    console.error('getStayTourismCompletionTimestamp:', error.message);
    return null;
  }

  if (!data) return null;

  const row = data as Record<string, unknown>;
  return row.tourism_registration_completed_at
    ? String(row.tourism_registration_completed_at)
    : null;
}
