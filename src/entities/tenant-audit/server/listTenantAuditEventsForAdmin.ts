import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import type { TenantAuditActorKind, TenantAuditEventFlags } from '../model/types';

const LIST_LIMIT = 30;

export type TenantAuditEventAdminRow = {
  id: string;
  createdAt: string;
  actorKind: TenantAuditActorKind;
  changedKeys: string[];
  flags: TenantAuditEventFlags;
};

type DbRow = {
  id: string;
  created_at: string;
  actor_kind: TenantAuditActorKind;
  changed_keys: string[] | null;
  flags: TenantAuditEventFlags | null;
};

export async function listTenantAuditEventsForAdmin(tenantId: string): Promise<{
  events: TenantAuditEventAdminRow[];
  error: string | null;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { events: [], error: 'Supabase admin not configured.' };
  }

  const { data, error } = await admin
    .from('tenant_audit_events')
    .select('id, created_at, actor_kind, changed_keys, flags')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);

  if (error) {
    return { events: [], error: error.message };
  }

  const events = ((data ?? []) as DbRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    actorKind: row.actor_kind,
    changedKeys: row.changed_keys ?? [],
    flags: row.flags ?? {},
  }));

  return { events, error: null };
}
