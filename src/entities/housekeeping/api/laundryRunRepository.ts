import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';

import {
  computeLaundryEndsAt,
  isHousekeepingLaundryProgram,
  isHousekeepingLaundryRunStatus,
  normalizeLaundryDurationMinutes,
} from '../lib/laundryRun';
import type {
  FinishLaundryRunInput,
  FinishLaundryRunResult,
  HousekeepingLaundryRunRecord,
  StartLaundryRunInput,
  StartLaundryRunResult,
} from '../model/types';

const LAUNDRY_COLUMNS =
  'id, tenant_id, machine_id, program, status, started_at, ends_at, completed_at, started_by_reception_user_id, created_at, updated_at';

function mapLaundryRow(row: Record<string, unknown>): HousekeepingLaundryRunRecord | null {
  if (!isHousekeepingLaundryRunStatus(row.status)) return null;
  if (!isHousekeepingLaundryProgram(row.program)) return null;
  const machineId = String(row.machine_id ?? '').trim();
  if (!machineId) return null;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    machine_id: machineId,
    program: row.program,
    status: row.status,
    started_at: String(row.started_at),
    ends_at: String(row.ends_at),
    completed_at: row.completed_at ? String(row.completed_at) : null,
    started_by_reception_user_id: row.started_by_reception_user_id
      ? String(row.started_by_reception_user_id)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listActiveLaundryRuns(
  tenantId: string
): Promise<HousekeepingLaundryRunRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('housekeeping_laundry_runs')
    .select(LAUNDRY_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('status', 'running');

  if (error) {
    console.error('listActiveLaundryRuns:', error.message);
    return [];
  }
  if (!data) return [];

  return data
    .map((row) => mapLaundryRow(row as Record<string, unknown>))
    .filter((row): row is HousekeepingLaundryRunRecord => row !== null);
}

export async function getActiveLaundryRunForMachine(
  tenantId: string,
  machineId: string
): Promise<HousekeepingLaundryRunRecord | null> {
  const id = machineId.trim();
  if (!id) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('housekeeping_laundry_runs')
    .select(LAUNDRY_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('machine_id', id)
    .eq('status', 'running')
    .maybeSingle();

  if (error) {
    console.error('getActiveLaundryRunForMachine:', error.message);
    return null;
  }
  if (!data) return null;
  return mapLaundryRow(data as Record<string, unknown>);
}

/** @deprecated Prefer listActiveLaundryRuns — kept for transitional callers. */
export async function getActiveLaundryRun(
  tenantId: string
): Promise<HousekeepingLaundryRunRecord | null> {
  const runs = await listActiveLaundryRuns(tenantId);
  return runs[0] ?? null;
}

export async function startLaundryRun(input: StartLaundryRunInput): Promise<StartLaundryRunResult> {
  const tenantId = input.tenantId.trim();
  const machineId = input.machineId.trim();
  if (!tenantId || !machineId || !isHousekeepingLaundryProgram(input.program)) {
    return { ok: false, error: 'invalid_input' };
  }

  const durationMinutes = normalizeLaundryDurationMinutes(input.durationMinutes, 0);
  if (durationMinutes < 1) {
    return { ok: false, error: 'invalid_input' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const existing = await getActiveLaundryRunForMachine(tenantId, machineId);
  if (existing) {
    return { ok: false, error: 'already_running' };
  }

  const startedAt = new Date();
  const endsAt = computeLaundryEndsAt(startedAt, durationMinutes);
  const nowIso = startedAt.toISOString();

  const { data, error } = await admin
    .from('housekeeping_laundry_runs')
    .insert({
      tenant_id: tenantId,
      machine_id: machineId,
      program: input.program,
      status: 'running',
      started_at: nowIso,
      ends_at: endsAt.toISOString(),
      completed_at: null,
      started_by_reception_user_id: input.startedByReceptionUserId?.trim() || null,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(LAUNDRY_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'already_running' };
    }
    console.error('startLaundryRun:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const run = mapLaundryRow(data as Record<string, unknown>);
  if (!run) {
    return { ok: false, error: 'db_unavailable' };
  }
  return { ok: true, run };
}

async function finishLaundryRun(
  input: FinishLaundryRunInput,
  nextStatus: 'done' | 'cancelled'
): Promise<FinishLaundryRunResult> {
  const tenantId = input.tenantId.trim();
  const runId = input.runId.trim();
  if (!tenantId || !runId) {
    return { ok: false, error: 'not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data: existing, error: readError } = await admin
    .from('housekeeping_laundry_runs')
    .select(LAUNDRY_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('id', runId)
    .maybeSingle();

  if (readError) {
    console.error('finishLaundryRun read:', readError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const current = mapLaundryRow(existing as Record<string, unknown>);
  if (!current) {
    return { ok: false, error: 'db_unavailable' };
  }
  if (current.status !== 'running') {
    return { ok: false, error: 'not_running' };
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await admin
    .from('housekeeping_laundry_runs')
    .update({
      status: nextStatus,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('tenant_id', tenantId)
    .eq('id', runId)
    .eq('status', 'running')
    .select(LAUNDRY_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('finishLaundryRun update:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!data) {
    return { ok: false, error: 'not_running' };
  }

  const run = mapLaundryRow(data as Record<string, unknown>);
  if (!run) {
    return { ok: false, error: 'db_unavailable' };
  }
  return { ok: true, run };
}

export async function completeLaundryRun(
  input: FinishLaundryRunInput
): Promise<FinishLaundryRunResult> {
  return finishLaundryRun(input, 'done');
}

export async function cancelLaundryRun(
  input: FinishLaundryRunInput
): Promise<FinishLaundryRunResult> {
  return finishLaundryRun(input, 'cancelled');
}
