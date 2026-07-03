'use server';

import { randomUUID } from 'crypto';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationProfile } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { uploadGuestTourismDocument } from '../api/uploadGuestTourismDocument';
import { DOCUMENT_KIND_TO_STORAGE_KEY } from '../model/tourismRegistrationProfiles';

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
        | 'invalid_file'
        | 'db_unavailable'
        | 'upload_failed';
    };

function readImageFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

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
  if (!firstName || !lastName) {
    return { ok: false, error: 'invalid_input' };
  }

  const documentFiles: { kind: string; storageKind: string; file: File }[] = [];
  for (const kind of profile.requiredDocumentKinds) {
    const formKey = kind === 'entry_stamp' ? 'entryStamp' : kind;
    const storageKind = DOCUMENT_KIND_TO_STORAGE_KEY[kind];
    const file = readImageFile(formData, formKey);
    if (!file) {
      return { ok: false, error: 'invalid_input' };
    }
    documentFiles.push({ kind, storageKind, file });
  }

  const guestRowId = randomUUID();

  const uploadResults: Record<string, string> = {};
  for (const doc of documentFiles) {
    const uploadResult = await uploadGuestTourismDocument({
      tenantId: tenant.id,
      stayId: session.stayId,
      guestRowId,
      kind: doc.storageKind,
      file: doc.file,
    });

    if (!uploadResult.ok) {
      return { ok: false, error: uploadResult.error };
    }
    uploadResults[doc.kind] = uploadResult.storagePath;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data, error } = await admin
    .from('guest_stay_tourism_guests')
    .insert({
      id: guestRowId,
      stay_id: session.stayId,
      first_name: firstName,
      last_name: lastName,
      passport_storage_path: uploadResults['passport'] ?? '',
      entry_stamp_storage_path: uploadResults['entry_stamp'] ?? '',
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
