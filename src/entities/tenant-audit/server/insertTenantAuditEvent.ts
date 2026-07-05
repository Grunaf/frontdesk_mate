import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import type { InsertTenantAuditEventInput } from '../model/types';

export async function insertTenantAuditEvent(input: InsertTenantAuditEventInput): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[insertTenantAuditEvent] Supabase admin not configured');
    return;
  }

  const { error } = await admin.from('tenant_audit_events').insert({
    tenant_id: input.tenantId,
    actor_kind: input.actorKind,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    changed_keys: input.changedKeys,
    flags: input.flags ?? {},
  });

  if (error) {
    console.error('[insertTenantAuditEvent] insert failed', {
      tenantId: input.tenantId,
      eventType: input.eventType,
      message: error.message,
    });
  }
}
