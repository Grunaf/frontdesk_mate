'use server';

import {
  isHousekeepingLaundryProgram,
  type HousekeepingLaundryProgram,
  type HousekeepingLaundryRunRecord,
} from '@/entities/housekeeping';
import {
  cancelLaundryRun,
  completeLaundryRun,
  listActiveLaundryRuns,
  startLaundryRun,
} from '@/entities/housekeeping/server';
import {
  resolveLaundryMachineById,
  resolveLaundryProgramDurationMinutes,
} from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';

import {
  assertReceptionHousekeepingAccess,
  resolveReceptionStaffContext,
} from '../lib/resolveReceptionStaffContext';

export type LaundryRunActionError =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'already_running'
  | 'not_running'
  | 'unknown_machine'
  | 'invalid_program'
  | 'db_unavailable'
  | 'unknown';

export type ListActiveLaundryRunsResult =
  | { ok: true; runs: HousekeepingLaundryRunRecord[] }
  | { ok: false; error: Extract<LaundryRunActionError, 'unauthorized' | 'forbidden' | 'not_found'> };

export type StartLaundryRunActionResult =
  | { ok: true; run: HousekeepingLaundryRunRecord }
  | { ok: false; error: LaundryRunActionError };

export type FinishLaundryRunActionResult =
  | { ok: true; run: HousekeepingLaundryRunRecord }
  | { ok: false; error: LaundryRunActionError };

async function resolveLaundryTenant(tenantSlug: string) {
  const staff = await resolveReceptionStaffContext(tenantSlug);
  if (!staff.ok) {
    return { ok: false as const, error: staff.error };
  }

  const gate = assertReceptionHousekeepingAccess(staff.ctx);
  if (!gate.ok) {
    return { ok: false as const, error: gate.error };
  }

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    return { ok: false as const, error: 'not_found' as const };
  }

  return { ok: true as const, tenant, staff: staff.ctx };
}

export async function listActiveLaundryRunsAction(
  tenantSlug: string
): Promise<ListActiveLaundryRunsResult> {
  const resolved = await resolveLaundryTenant(tenantSlug);
  if (!resolved.ok) {
    return resolved;
  }

  const runs = await listActiveLaundryRuns(resolved.tenant.id);
  return { ok: true, runs };
}

export async function startLaundryRunAction(input: {
  tenantSlug: string;
  machineId: string;
  program: HousekeepingLaundryProgram;
}): Promise<StartLaundryRunActionResult> {
  const resolved = await resolveLaundryTenant(input.tenantSlug);
  if (!resolved.ok) return resolved;

  if (!isHousekeepingLaundryProgram(input.program)) {
    return { ok: false, error: 'invalid_program' };
  }

  const machine = resolveLaundryMachineById(resolved.tenant.settings, input.machineId);
  if (!machine) {
    return { ok: false, error: 'unknown_machine' };
  }

  const durationMinutes = resolveLaundryProgramDurationMinutes(machine, input.program);

  try {
    const result = await startLaundryRun({
      tenantId: resolved.tenant.id,
      machineId: machine.id,
      program: input.program,
      durationMinutes,
      startedByReceptionUserId: resolved.staff.id,
    });
    if (!result.ok) {
      return { ok: false, error: result.error === 'invalid_input' ? 'unknown' : result.error };
    }
    return { ok: true, run: result.run };
  } catch (error) {
    console.error('startLaundryRunAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export async function completeLaundryRunAction(input: {
  tenantSlug: string;
  runId: string;
}): Promise<FinishLaundryRunActionResult> {
  const resolved = await resolveLaundryTenant(input.tenantSlug);
  if (!resolved.ok) return resolved;

  try {
    const result = await completeLaundryRun({
      tenantId: resolved.tenant.id,
      runId: input.runId,
    });
    if (!result.ok) return result;
    return { ok: true, run: result.run };
  } catch (error) {
    console.error('completeLaundryRunAction:', error);
    return { ok: false, error: 'unknown' };
  }
}

export async function cancelLaundryRunAction(input: {
  tenantSlug: string;
  runId: string;
}): Promise<FinishLaundryRunActionResult> {
  const resolved = await resolveLaundryTenant(input.tenantSlug);
  if (!resolved.ok) return resolved;

  try {
    const result = await cancelLaundryRun({
      tenantId: resolved.tenant.id,
      runId: input.runId,
    });
    if (!result.ok) return result;
    return { ok: true, run: result.run };
  } catch (error) {
    console.error('cancelLaundryRunAction:', error);
    return { ok: false, error: 'unknown' };
  }
}
