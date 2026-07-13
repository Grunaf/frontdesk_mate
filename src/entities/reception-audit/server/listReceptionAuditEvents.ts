import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import type {
  ReceptionAuditEventFlags,
  ReceptionAuditEventRow,
  ReceptionAuditEventType,
  ReceptionAuditSubjectType,
} from '../model/types';
import { isReceptionAuditEventType } from '../model/types';

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

export type ListReceptionAuditEventsOptions = {
  limit?: number;
};

export type ReceptionAuditEventListRow = ReceptionAuditEventRow & {
  actorLogin: string | null;
  actorDisplayName: string | null;
};

type DbRow = {
  id: string;
  created_at: string;
  actor_reception_user_id: string | null;
  event_type: string;
  subject_type: string | null;
  subject_id: string | null;
  flags: ReceptionAuditEventFlags | null;
};

type ActorDbRow = {
  id: string;
  login: string;
  display_name: string;
};

function resolveLimit(limit: number | undefined): number {
  if (limit == null || !Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_LIST_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_LIST_LIMIT);
}

function mapRow(row: DbRow): ReceptionAuditEventRow | null {
  if (!isReceptionAuditEventType(row.event_type)) {
    return null;
  }

  const subjectType =
    row.subject_type === 'guest_stay' || row.subject_type === 'guest_hub_transfer'
      ? (row.subject_type as ReceptionAuditSubjectType)
      : null;

  return {
    id: row.id,
    createdAt: row.created_at,
    actorReceptionUserId: row.actor_reception_user_id,
    eventType: row.event_type as ReceptionAuditEventType,
    subjectType,
    subjectId: row.subject_id,
    flags: row.flags ?? {},
  };
}

async function loadActorLookup(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  actorIds: string[]
): Promise<Map<string, { login: string; displayName: string }>> {
  const uniqueIds = [...new Set(actorIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await admin
    .from('reception_users')
    .select('id, login, display_name')
    .in('id', uniqueIds);

  if (error || !data) {
    return new Map();
  }

  const lookup = new Map<string, { login: string; displayName: string }>();
  for (const row of data as ActorDbRow[]) {
    lookup.set(row.id, {
      login: String(row.login),
      displayName: String(row.display_name),
    });
  }
  return lookup;
}

export async function listReceptionAuditEvents(
  tenantId: string,
  options: ListReceptionAuditEventsOptions = {}
): Promise<{
  events: ReceptionAuditEventListRow[];
  error: string | null;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { events: [], error: 'Supabase admin not configured.' };
  }

  const { data, error } = await admin
    .from('reception_audit_events')
    .select(
      'id, created_at, actor_reception_user_id, event_type, subject_type, subject_id, flags'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(resolveLimit(options.limit));

  if (error) {
    return { events: [], error: error.message };
  }

  const baseEvents = ((data ?? []) as DbRow[])
    .map(mapRow)
    .filter((row): row is ReceptionAuditEventRow => row != null);

  const actorLookup = await loadActorLookup(
    admin,
    baseEvents
      .map((event) => event.actorReceptionUserId)
      .filter((id): id is string => id != null)
  );

  const events: ReceptionAuditEventListRow[] = baseEvents.map((event) => {
    const actor = event.actorReceptionUserId
      ? actorLookup.get(event.actorReceptionUserId)
      : undefined;
    return {
      ...event,
      actorLogin: actor?.login ?? null,
      actorDisplayName: actor?.displayName ?? null,
    };
  });

  return { events, error: null };
}
