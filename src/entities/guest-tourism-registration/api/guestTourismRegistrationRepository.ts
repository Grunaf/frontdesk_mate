import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { isTourismRegistrationComplete as isTourismRegistrationCompleteSummary } from '../lib/isTourismRegistrationComplete';
import type { GuestTourismGuest, GuestTourismRegistrationSummary } from '../model/types';

const GUEST_DOCUMENTS_BUCKET = 'guest-documents';

const SIGNED_URL_TTL_SECONDS = 10 * 60;

const STAY_TOURISM_COLUMNS =
  'tourism_contact_whatsapp, tourism_registration_completed_at, tourism_exported_at';

const GUEST_TOURISM_COLUMNS =
  'id, stay_id, first_name, last_name, passport_storage_path, entry_stamp_storage_path, created_at';

function mapGuestRow(row: Record<string, unknown>): GuestTourismGuest {
  return {
    id: String(row.id),
    stay_id: String(row.stay_id),
    first_name: String(row.first_name),
    last_name: String(row.last_name),
    passport_storage_path: String(row.passport_storage_path),
    entry_stamp_storage_path: String(row.entry_stamp_storage_path),
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
