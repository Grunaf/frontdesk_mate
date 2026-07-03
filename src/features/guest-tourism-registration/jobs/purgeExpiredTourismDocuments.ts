import 'server-only';

/**
 * Tourism document retention (GDPR storage limitation — Chat A).
 *
 * Policy: delete `guest-documents` objects and `guest_stay_tourism_guests` rows when
 * `guest_stays.check_out_at` is at least N days in the past (default 90). Clears
 * `tourism_contact_whatsapp`; keeps `tourism_registration_completed_at` and
 * `tourism_exported_at` on the stay for reception audit.
 *
 * ## Ops / cron
 *
 * Run daily via Vercel Cron (`GET /api/cron/tourism-document-purge`, `CRON_SECRET`) or any
 * trusted caller with `SUPABASE_SECRET_KEY` set.
 *
 * Env:
 * - `TOURISM_DOCUMENT_RETENTION_DAYS` — override default 90
 * - `TOURISM_DOCUMENT_PURGE_BATCH_LIMIT` — default 50
 * - `TOURISM_DOCUMENT_PURGE_DRY_RUN=1` — log actions without storage/DB writes
 */

import {
  clearTourismContactWhatsappForStay,
  deleteTourismGuestsByStayId,
  listStaysWithTourismGuestsPastCheckOut,
  listTourismGuestsByStayId,
  removeGuestDocumentObjectsFromStorage,
} from '@/entities/guest-tourism-registration/server';
import {
  DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS,
  isTourismDocumentRetentionDue,
  resolveTourismDocumentRetentionCutoffIso,
} from '../lib/tourismDocumentRetentionPolicy';

export type PurgeExpiredTourismDocumentsResult = {
  dryRun: boolean;
  retentionDays: number;
  processedStayCount: number;
  skippedStayCount: number;
  deletedStorageObjectCount: number;
  errors: string[];
};

function readRetentionDays(): number {
  const raw = process.env.TOURISM_DOCUMENT_RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS;
  }
  return parsed;
}

function readBatchLimit(): number {
  const raw = process.env.TOURISM_DOCUMENT_PURGE_BATCH_LIMIT?.trim();
  if (!raw) return 50;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 50;
  return Math.min(parsed, 500);
}

function isDryRun(): boolean {
  const raw = process.env.TOURISM_DOCUMENT_PURGE_DRY_RUN?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export async function purgeExpiredTourismDocuments(
  now: Date = new Date()
): Promise<PurgeExpiredTourismDocumentsResult> {
  const retentionDays = readRetentionDays();
  const batchLimit = readBatchLimit();
  const dryRun = isDryRun();
  const cutoffIso = resolveTourismDocumentRetentionCutoffIso(now, retentionDays);

  const candidates = await listStaysWithTourismGuestsPastCheckOut(cutoffIso, batchLimit);

  let processedStayCount = 0;
  let skippedStayCount = 0;
  let deletedStorageObjectCount = 0;
  const errors: string[] = [];

  for (const stay of candidates) {
    if (!isTourismDocumentRetentionDue(stay.check_out_at, now, retentionDays)) {
      skippedStayCount += 1;
      continue;
    }

    const guests = await listTourismGuestsByStayId(stay.stay_id);
    if (guests.length === 0) {
      skippedStayCount += 1;
      continue;
    }

    const storagePaths = guests.flatMap((guest) => [
      guest.passport_storage_path,
      guest.entry_stamp_storage_path,
    ]);

    if (dryRun) {
      console.info('[tourism-document-purge] dry-run stay', {
        stay_id: stay.stay_id,
        tenant_id: stay.tenant_id,
        check_out_at: stay.check_out_at,
        storage_object_count: storagePaths.length,
        guest_row_count: guests.length,
      });
      processedStayCount += 1;
      deletedStorageObjectCount += storagePaths.length;
      continue;
    }

    const { removedCount } = await removeGuestDocumentObjectsFromStorage(storagePaths);
    deletedStorageObjectCount += removedCount;

    const guestsDeleted = await deleteTourismGuestsByStayId(stay.stay_id);
    if (!guestsDeleted) {
      errors.push(`delete guests failed stay_id=${stay.stay_id}`);
      continue;
    }

    const whatsappCleared = await clearTourismContactWhatsappForStay(stay.stay_id);
    if (!whatsappCleared) {
      errors.push(`clear whatsapp failed stay_id=${stay.stay_id}`);
    }

    console.info('[tourism-document-purge] purged stay', {
      stay_id: stay.stay_id,
      tenant_id: stay.tenant_id,
      deleted_storage_object_count: removedCount,
      guest_row_count: guests.length,
    });

    processedStayCount += 1;
  }

  return {
    dryRun,
    retentionDays,
    processedStayCount,
    skippedStayCount,
    deletedStorageObjectCount,
    errors,
  };
}
