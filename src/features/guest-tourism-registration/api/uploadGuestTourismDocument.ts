import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';

export const GUEST_DOCUMENTS_BUCKET = 'guest-documents';

export type GuestTourismDocumentKind = 'passport' | 'entry-stamp';

const DOCUMENT_FILE_NAME: Record<GuestTourismDocumentKind, string> = {
  passport: 'passport.webp',
  'entry-stamp': 'entry-stamp.webp',
};

const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/webp']);

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function buildGuestTourismDocumentPath(
  tenantId: string,
  stayId: string,
  guestRowId: string,
  kind: GuestTourismDocumentKind
): string {
  return `${tenantId}/${stayId}/${guestRowId}/${DOCUMENT_FILE_NAME[kind]}`;
}

export type UploadGuestTourismDocumentResult =
  | { ok: true; storagePath: string }
  | { ok: false; error: 'invalid_file' | 'db_unavailable' | 'upload_failed' };

function isAllowedTourismDocumentFile(file: File): boolean {
  if (!file.size || file.size > MAX_UPLOAD_BYTES) {
    return false;
  }

  if (ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return true;
  }

  const name = file.name.toLowerCase();
  return name.endsWith('.webp') || name.endsWith('.jpg') || name.endsWith('.jpeg');
}

export async function uploadGuestTourismDocument(input: {
  tenantId: string;
  stayId: string;
  guestRowId: string;
  kind: GuestTourismDocumentKind;
  file: File;
}): Promise<UploadGuestTourismDocumentResult> {
  if (!isAllowedTourismDocumentFile(input.file)) {
    return { ok: false, error: 'invalid_file' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const storagePath = buildGuestTourismDocumentPath(
    input.tenantId,
    input.stayId,
    input.guestRowId,
    input.kind
  );

  const contentType =
    input.file.type === 'image/jpeg' || input.file.type === 'image/webp'
      ? input.file.type
      : storagePath.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

  const { error } = await admin.storage.from(GUEST_DOCUMENTS_BUCKET).upload(storagePath, input.file, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error('uploadGuestTourismDocument:', error.message);
    return { ok: false, error: 'upload_failed' };
  }

  return { ok: true, storagePath };
}
