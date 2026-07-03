'use server';

import { revalidatePath } from 'next/cache';

import { assertReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import type { GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';
import {
  createTourismDocumentSignedUrl,
  getStayTourismCompletionTimestamp,
  getTourismRegistrationByStayId,
  setTourismExportedAt,
  type TourismReceptionDocumentKind,
} from '@/entities/guest-tourism-registration/server';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';

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
    .from('guest_stays')
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
