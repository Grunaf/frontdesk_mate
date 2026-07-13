import 'server-only';

import { getTenantRecord } from '@/entities/tenant/server';
import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { isGuestIssueCategory } from '../lib/isGuestIssueCategory';
import type {
  CreateGuestIssueInput,
  CreateGuestIssueResult,
  GuestIssueRecord,
  ListGuestIssuesFilter,
  ResolveGuestIssueResult,
} from '../model/types';

const MAX_OPEN_ISSUES_PER_STAY = 3;
const MAX_NOTE_LENGTH = 500;

const GUEST_ISSUE_COLUMNS =
  'id, tenant_id, stay_id, bed_id, category, note, status, guest_name, created_at, resolved_at';

function mapRow(row: Record<string, unknown>): GuestIssueRecord {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    stay_id: String(row.stay_id),
    bed_id: String(row.bed_id),
    category: String(row.category) as GuestIssueRecord['category'],
    note: row.note ? String(row.note) : null,
    status: String(row.status) as GuestIssueRecord['status'],
    guest_name: row.guest_name ? String(row.guest_name) : null,
    created_at: String(row.created_at),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
  };
}

async function countOpenIssuesForStay(stayId: string): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { count, error } = await admin
    .from('guest_issues')
    .select('id', { count: 'exact', head: true })
    .eq('stay_id', stayId)
    .eq('status', 'open');

  if (error) {
    console.error('countOpenIssuesForStay:', error.message);
    return null;
  }

  return count ?? 0;
}

export async function createGuestIssue(input: CreateGuestIssueInput): Promise<CreateGuestIssueResult> {
  if (!isGuestIssueCategory(input.category)) {
    return { ok: false, error: 'invalid_category' };
  }

  const note = input.note?.trim() || null;
  if (note && note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: 'note_too_long' };
  }

  const session = await resolveGuestSessionFromCookies(input.tenantSlug);
  if (!session || session.stayId !== input.stayId) {
    return { ok: false, error: 'unauthorized' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const openCount = await countOpenIssuesForStay(session.stayId);
  if (openCount === null) {
    return { ok: false, error: 'db_unavailable' };
  }

  if (openCount >= MAX_OPEN_ISSUES_PER_STAY) {
    return { ok: false, error: 'too_many_open' };
  }

  const { data, error } = await admin
    .from('guest_issues')
    .insert({
      tenant_id: tenant.id,
      stay_id: session.stayId,
      bed_id: session.bedId,
      category: input.category,
      note,
      guest_name: session.guestName?.trim() || null,
      status: 'open',
    })
    .select(GUEST_ISSUE_COLUMNS)
    .single();

  if (error || !data) {
    console.error('createGuestIssue:', error?.message ?? 'no data');
    return { ok: false, error: 'db_unavailable' };
  }

  const issue = mapRow(data as Record<string, unknown>);

  void import('@/entities/reception-push/lib/receptionPushNotifications').then(({ notifyReceptionGuestIssue }) =>
    notifyReceptionGuestIssue({
      tenantSlug: input.tenantSlug,
      category: input.category,
      guestName: issue.guest_name,
    })
  );

  return { ok: true, issue };
}

export async function listGuestIssues(
  tenantSlug: string,
  filter: ListGuestIssuesFilter
): Promise<GuestIssueRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  let query = admin
    .from('guest_issues')
    .select(GUEST_ISSUE_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('status', filter)
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('listGuestIssues:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function countOpenGuestIssues(tenantSlug: string): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return 0;

  const { count, error } = await admin
    .from('guest_issues')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('status', 'open');

  if (error) {
    console.error('countOpenGuestIssues:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function resolveGuestIssue(input: {
  tenantSlug: string;
  issueId: string;
}): Promise<ResolveGuestIssueResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'not_found' };
  }

  const { data, error } = await admin
    .from('guest_issues')
    .update({
      status: 'done',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', input.issueId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('resolveGuestIssue:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}
