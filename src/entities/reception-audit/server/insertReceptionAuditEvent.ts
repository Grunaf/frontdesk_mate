import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import type { InsertReceptionAuditEventInput } from '../model/types';

/**
 * Fire-and-forget audit write. Failures are logged only — callers must not
 * abort desk mutations when this insert fails (same pattern as tenant-audit).
 */
export async function insertReceptionAuditEvent(
  input: InsertReceptionAuditEventInput
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[insertReceptionAuditEvent] Supabase admin not configured');
    return;
  }

  const { error } = await admin.from('reception_audit_events').insert({
    tenant_id: input.tenantId,
    actor_reception_user_id: input.actorReceptionUserId,
    event_type: input.eventType,
    subject_type: input.subjectType ?? null,
    subject_id: input.subjectId ?? null,
    flags: input.flags ?? {},
  });

  if (error) {
    console.error('[insertReceptionAuditEvent] insert failed', {
      tenantId: input.tenantId,
      eventType: input.eventType,
      message: error.message,
    });
  }
}
