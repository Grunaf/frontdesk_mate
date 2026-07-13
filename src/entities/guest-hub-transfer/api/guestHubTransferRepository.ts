import 'server-only';

import { getTenantRecord } from '@/entities/tenant/server';
import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { isValidTimeValue } from '@/shared/lib/time';
import { isHubCategory } from '../lib/isHubCategory';
import { isHubTransferDirection } from '../lib/isHubTransferDirection';
import { isValidRequestedDate } from '../lib/isValidRequestedDate';
import type {
  CreateGuestHubTransferInput,
  CreateGuestHubTransferResult,
  GuestHubTransferRecord,
  ListGuestHubTransfersFilter,
  ResolveGuestHubTransferResult,
} from '../model/types';

const MAX_OPEN_TRANSFERS_PER_STAY = 5;
const MAX_NOTE_LENGTH = 500;

const GUEST_HUB_TRANSFER_COLUMNS =
  'id, tenant_id, stay_id, bed_id, guest_name, hub_category, direction, requested_date, requested_time, status, note, created_at, resolved_at';

function mapRow(row: Record<string, unknown>): GuestHubTransferRecord {
  const requestedDate = row.requested_date;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    stay_id: String(row.stay_id),
    bed_id: String(row.bed_id),
    guest_name: row.guest_name ? String(row.guest_name) : null,
    hub_category: String(row.hub_category) as GuestHubTransferRecord['hub_category'],
    direction: String(row.direction) as GuestHubTransferRecord['direction'],
    requested_date:
      typeof requestedDate === 'string'
        ? requestedDate.slice(0, 10)
        : String(requestedDate).slice(0, 10),
    requested_time: String(row.requested_time),
    status: String(row.status) as GuestHubTransferRecord['status'],
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at),
    resolved_at: row.resolved_at ? String(row.resolved_at) : null,
  };
}

async function countOpenTransfersForStay(stayId: string): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { count, error } = await admin
    .from('guest_hub_transfer_requests')
    .select('id', { count: 'exact', head: true })
    .eq('stay_id', stayId)
    .eq('status', 'open');

  if (error) {
    console.error('countOpenTransfersForStay:', error.message);
    return null;
  }

  return count ?? 0;
}

export async function createGuestHubTransfer(
  input: CreateGuestHubTransferInput
): Promise<CreateGuestHubTransferResult> {
  if (!isHubCategory(input.hubCategory)) {
    return { ok: false, error: 'invalid_category' };
  }

  if (!isHubTransferDirection(input.direction)) {
    return { ok: false, error: 'invalid_direction' };
  }

  const requestedDate = input.requestedDate.trim();
  if (!isValidRequestedDate(requestedDate)) {
    return { ok: false, error: 'invalid_date' };
  }

  const requestedTime = input.requestedTime.trim();
  if (!isValidTimeValue(requestedTime)) {
    return { ok: false, error: 'invalid_time' };
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

  const openCount = await countOpenTransfersForStay(session.stayId);
  if (openCount === null) {
    return { ok: false, error: 'db_unavailable' };
  }

  if (openCount >= MAX_OPEN_TRANSFERS_PER_STAY) {
    return { ok: false, error: 'too_many_open' };
  }

  const { data, error } = await admin
    .from('guest_hub_transfer_requests')
    .insert({
      tenant_id: tenant.id,
      stay_id: session.stayId,
      bed_id: session.bedId,
      guest_name: session.guestName?.trim() || null,
      hub_category: input.hubCategory,
      direction: input.direction,
      requested_date: requestedDate,
      requested_time: requestedTime,
      note,
      status: 'open',
    })
    .select(GUEST_HUB_TRANSFER_COLUMNS)
    .single();

  if (error || !data) {
    console.error('createGuestHubTransfer:', error?.message ?? 'no data');
    return { ok: false, error: 'db_unavailable' };
  }

  const transfer = mapRow(data as Record<string, unknown>);

  void import('@/entities/reception-push/lib/receptionPushNotifications').then(({ notifyReceptionHubTransfer }) =>
    notifyReceptionHubTransfer({
      tenantSlug: input.tenantSlug,
      transfer,
    })
  );

  return { ok: true, transfer };
}

export async function listGuestHubTransfers(
  tenantSlug: string,
  filter: ListGuestHubTransfersFilter
): Promise<GuestHubTransferRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  const { data, error } = await admin
    .from('guest_hub_transfer_requests')
    .select(GUEST_HUB_TRANSFER_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('status', filter)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listGuestHubTransfers:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function countOpenGuestHubTransfers(tenantSlug: string): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return 0;

  const { count, error } = await admin
    .from('guest_hub_transfer_requests')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('status', 'open');

  if (error) {
    console.error('countOpenGuestHubTransfers:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function resolveGuestHubTransfer(input: {
  tenantSlug: string;
  transferId: string;
}): Promise<ResolveGuestHubTransferResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'not_found' };
  }

  const { data, error } = await admin
    .from('guest_hub_transfer_requests')
    .update({
      status: 'done',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', input.transferId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('resolveGuestHubTransfer:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}
