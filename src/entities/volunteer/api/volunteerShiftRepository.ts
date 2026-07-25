import 'server-only';

import {
  addStayCalendarDays,
  normalizePropertyTimeZone,
  propertyLocalDateTimeToUtcMs,
} from '@/entities/guest-stay';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';

import {
  endOfIsoWeekCalendarDay,
  shiftPropertyCalendarDay,
  startOfIsoWeekCalendarDay,
} from '../lib/volunteerShiftHours';
import type {
  CreateVolunteerShiftInput,
  CreateVolunteerShiftResult,
  CreateVolunteerShiftsBulkInput,
  CreateVolunteerShiftsBulkResult,
  DeleteVolunteerShiftResult,
  UpdateVolunteerShiftInput,
  UpdateVolunteerShiftResult,
  UpdateVolunteerWeeklyHoursTargetResult,
  VolunteerShiftRecord,
} from '../model/types';

const SHIFT_COLUMNS =
  'id, tenant_id, volunteer_id, starts_at, ends_at, notes, created_at, updated_at';

const TIME_HH_MM_RE = /^(\d{1,2}):(\d{2})$/;
const CALENDAR_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function mapShiftRow(row: Record<string, unknown>): VolunteerShiftRecord | null {
  if (!row.id || !row.volunteer_id || !row.starts_at || !row.ends_at) return null;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    volunteer_id: String(row.volunteer_id),
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    notes: row.notes != null ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function normalizeHhMm(value: string): string | null {
  const match = TIME_HH_MM_RE.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function resolveSameDayRangeMs(
  workDate: string,
  startTime: string,
  endTime: string,
  timeZone: string
): { startMs: number; endMs: number } | null {
  if (!CALENDAR_DAY_RE.test(workDate) || endTime <= startTime) return null;
  const startMs = propertyLocalDateTimeToUtcMs(workDate, startTime, timeZone);
  const endMs = propertyLocalDateTimeToUtcMs(workDate, endTime, timeZone);
  if (startMs == null || endMs == null || endMs <= startMs) return null;
  return { startMs, endMs };
}

/** Inclusive property-local week → UTC exclusive end bound for querying shifts. */
export function resolveWeekUtcBounds(
  weekStartMonday: string,
  propertyTimeZone?: string | null
): { weekStart: string; weekStartIso: string; weekEndExclusiveIso: string } | null {
  const start = startOfIsoWeekCalendarDay(weekStartMonday);
  const sunday = start ? endOfIsoWeekCalendarDay(start) : null;
  if (!start || !sunday) return null;

  const timeZone = normalizePropertyTimeZone(propertyTimeZone);
  const startMs = propertyLocalDateTimeToUtcMs(start, '00:00', timeZone);
  if (startMs == null) return null;

  const [sy, sm, sd] = sunday.split('-').map(Number);
  const mondayNext = new Date(Date.UTC(sy, sm - 1, sd + 1)).toISOString().slice(0, 10);
  const endMs = propertyLocalDateTimeToUtcMs(mondayNext, '00:00', timeZone);
  if (endMs == null) return null;

  return {
    weekStart: start,
    weekStartIso: new Date(startMs).toISOString(),
    weekEndExclusiveIso: new Date(endMs).toISOString(),
  };
}

function resolveDateRangeUtcBounds(
  workDates: string[],
  propertyTimeZone?: string | null
): { startIso: string; endExclusiveIso: string } | null {
  const sorted = [...workDates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return null;

  const timeZone = normalizePropertyTimeZone(propertyTimeZone);
  const startMs = propertyLocalDateTimeToUtcMs(first, '00:00', timeZone);
  const dayAfterLast = addStayCalendarDays(last, 1);
  const endMs = propertyLocalDateTimeToUtcMs(dayAfterLast, '00:00', timeZone);
  if (startMs == null || endMs == null) return null;

  return {
    startIso: new Date(startMs).toISOString(),
    endExclusiveIso: new Date(endMs).toISOString(),
  };
}

export async function listVolunteerShiftsForWeek(input: {
  tenantSlug: string;
  weekStartMonday: string;
}): Promise<VolunteerShiftRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return [];

  const weekStart = startOfIsoWeekCalendarDay(input.weekStartMonday);
  if (!weekStart) return [];

  const bounds = resolveWeekUtcBounds(weekStart, tenant.settings.propertyTimeZone);
  if (!bounds) return [];

  const { data, error } = await admin
    .from('volunteer_shifts')
    .select(SHIFT_COLUMNS)
    .eq('tenant_id', tenant.id)
    .gte('starts_at', bounds.weekStartIso)
    .lt('starts_at', bounds.weekEndExclusiveIso)
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('listVolunteerShiftsForWeek:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => mapShiftRow(row as Record<string, unknown>))
    .filter((row): row is VolunteerShiftRecord => row != null);
}

export async function createVolunteerShift(
  input: CreateVolunteerShiftInput
): Promise<CreateVolunteerShiftResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'tenant_not_found' };

  const workDate = input.workDate.trim();
  const startTime = normalizeHhMm(input.startTime);
  const endTime = normalizeHhMm(input.endTime);
  if (!startTime || !endTime) {
    return { ok: false, error: 'invalid_range' };
  }

  const timeZone = normalizePropertyTimeZone(tenant.settings.propertyTimeZone);
  const range = resolveSameDayRangeMs(workDate, startTime, endTime, timeZone);
  if (!range) {
    return { ok: false, error: 'invalid_range' };
  }

  const { data: volunteerRow, error: volunteerError } = await admin
    .from('volunteers')
    .select('id, is_archived')
    .eq('id', input.volunteerId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (volunteerError) {
    console.error('createVolunteerShift load volunteer:', volunteerError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!volunteerRow) return { ok: false, error: 'not_found' };
  if (volunteerRow.is_archived) return { ok: false, error: 'archived' };

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from('volunteer_shifts')
    .insert({
      tenant_id: tenant.id,
      volunteer_id: input.volunteerId,
      starts_at: new Date(range.startMs).toISOString(),
      ends_at: new Date(range.endMs).toISOString(),
      notes: input.notes?.trim() || null,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(SHIFT_COLUMNS)
    .single();

  if (error || !data) {
    console.error('createVolunteerShift:', error?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const shift = mapShiftRow(data as Record<string, unknown>);
  if (!shift) return { ok: false, error: 'db_unavailable' };
  return { ok: true, shift };
}

export async function createVolunteerShiftsBulk(
  input: CreateVolunteerShiftsBulkInput
): Promise<CreateVolunteerShiftsBulkResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'tenant_not_found' };

  const startTime = normalizeHhMm(input.startTime);
  const endTime = normalizeHhMm(input.endTime);
  if (!startTime || !endTime || endTime <= startTime) {
    return { ok: false, error: 'invalid_range' };
  }

  const workDates = [
    ...new Set(
      input.workDates
        .map((day) => day.trim())
        .filter((day) => CALENDAR_DAY_RE.test(day))
    ),
  ].sort();
  if (workDates.length === 0) {
    return { ok: false, error: 'invalid_range' };
  }

  const timeZone = normalizePropertyTimeZone(tenant.settings.propertyTimeZone);
  const conflictPolicy = input.conflictPolicy === 'overwrite' ? 'overwrite' : 'skip';

  const { data: volunteerRow, error: volunteerError } = await admin
    .from('volunteers')
    .select('id, is_archived')
    .eq('id', input.volunteerId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (volunteerError) {
    console.error('createVolunteerShiftsBulk load volunteer:', volunteerError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!volunteerRow) return { ok: false, error: 'not_found' };
  if (volunteerRow.is_archived) return { ok: false, error: 'archived' };

  const bounds = resolveDateRangeUtcBounds(workDates, timeZone);
  if (!bounds) return { ok: false, error: 'invalid_range' };

  const { data: existingRows, error: existingError } = await admin
    .from('volunteer_shifts')
    .select(SHIFT_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('volunteer_id', input.volunteerId)
    .gte('starts_at', bounds.startIso)
    .lt('starts_at', bounds.endExclusiveIso);

  if (existingError) {
    console.error('createVolunteerShiftsBulk load existing:', existingError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const existingByDay = new Map<string, VolunteerShiftRecord[]>();
  for (const row of existingRows ?? []) {
    const shift = mapShiftRow(row as Record<string, unknown>);
    if (!shift) continue;
    const day = shiftPropertyCalendarDay(shift.starts_at, timeZone);
    if (!day) continue;
    const list = existingByDay.get(day) ?? [];
    list.push(shift);
    existingByDay.set(day, list);
  }

  const skippedDates: string[] = [];
  const overwrittenDates: string[] = [];
  const datesToCreate: string[] = [];
  const idsToDelete: string[] = [];

  for (const workDate of workDates) {
    const existing = existingByDay.get(workDate) ?? [];
    if (existing.length === 0) {
      datesToCreate.push(workDate);
      continue;
    }
    if (conflictPolicy === 'skip') {
      skippedDates.push(workDate);
      continue;
    }
    overwrittenDates.push(workDate);
    idsToDelete.push(...existing.map((shift) => shift.id));
    datesToCreate.push(workDate);
  }

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await admin
      .from('volunteer_shifts')
      .delete()
      .eq('tenant_id', tenant.id)
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('createVolunteerShiftsBulk overwrite delete:', deleteError.message);
      return { ok: false, error: 'db_unavailable' };
    }
  }

  if (datesToCreate.length === 0) {
    return { ok: true, created: [], skippedDates, overwrittenDates };
  }

  const nowIso = new Date().toISOString();
  const notes = input.notes?.trim() || null;
  const insertRows: Array<{
    tenant_id: string;
    volunteer_id: string;
    starts_at: string;
    ends_at: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }> = [];

  for (const workDate of datesToCreate) {
    const range = resolveSameDayRangeMs(workDate, startTime, endTime, timeZone);
    if (!range) {
      return { ok: false, error: 'invalid_range' };
    }
    insertRows.push({
      tenant_id: tenant.id,
      volunteer_id: input.volunteerId,
      starts_at: new Date(range.startMs).toISOString(),
      ends_at: new Date(range.endMs).toISOString(),
      notes,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }

  const { data, error } = await admin
    .from('volunteer_shifts')
    .insert(insertRows)
    .select(SHIFT_COLUMNS);

  if (error || !data) {
    console.error('createVolunteerShiftsBulk:', error?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const created = data
    .map((row) => mapShiftRow(row as Record<string, unknown>))
    .filter((row): row is VolunteerShiftRecord => row != null);

  return { ok: true, created, skippedDates, overwrittenDates };
}

export async function updateVolunteerShift(
  input: UpdateVolunteerShiftInput
): Promise<UpdateVolunteerShiftResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'tenant_not_found' };

  const workDate = input.workDate.trim();
  const startTime = normalizeHhMm(input.startTime);
  const endTime = normalizeHhMm(input.endTime);
  if (!startTime || !endTime) {
    return { ok: false, error: 'invalid_range' };
  }

  const timeZone = normalizePropertyTimeZone(tenant.settings.propertyTimeZone);
  const range = resolveSameDayRangeMs(workDate, startTime, endTime, timeZone);
  if (!range) {
    return { ok: false, error: 'invalid_range' };
  }

  const { data: existing, error: loadError } = await admin
    .from('volunteer_shifts')
    .select('id, volunteer_id')
    .eq('id', input.shiftId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (loadError) {
    console.error('updateVolunteerShift load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!existing) return { ok: false, error: 'not_found' };

  const { data: volunteerRow, error: volunteerError } = await admin
    .from('volunteers')
    .select('id, is_archived')
    .eq('id', existing.volunteer_id)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (volunteerError) {
    console.error('updateVolunteerShift volunteer:', volunteerError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!volunteerRow) return { ok: false, error: 'not_found' };
  if (volunteerRow.is_archived) return { ok: false, error: 'archived' };

  const patch: Record<string, unknown> = {
    starts_at: new Date(range.startMs).toISOString(),
    ends_at: new Date(range.endMs).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (input.notes !== undefined) {
    patch.notes = input.notes?.trim() || null;
  }

  const { data, error } = await admin
    .from('volunteer_shifts')
    .update(patch)
    .eq('id', input.shiftId)
    .eq('tenant_id', tenant.id)
    .select(SHIFT_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error('updateVolunteerShift:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!data) return { ok: false, error: 'not_found' };

  const shift = mapShiftRow(data as Record<string, unknown>);
  if (!shift) return { ok: false, error: 'db_unavailable' };
  return { ok: true, shift };
}

export async function deleteVolunteerShift(input: {
  tenantSlug: string;
  shiftId: string;
}): Promise<DeleteVolunteerShiftResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'tenant_not_found' };

  const { data, error } = await admin
    .from('volunteer_shifts')
    .delete()
    .eq('id', input.shiftId)
    .eq('tenant_id', tenant.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('deleteVolunteerShift:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true };
}

export async function updateVolunteerWeeklyHoursTarget(input: {
  tenantSlug: string;
  volunteerId: string;
  weeklyHoursTarget: number;
}): Promise<UpdateVolunteerWeeklyHoursTargetResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'tenant_not_found' };

  const target = Number(input.weeklyHoursTarget);
  if (!Number.isFinite(target) || target <= 0 || target > 168) {
    return { ok: false, error: 'invalid_target' };
  }

  const { data, error } = await admin
    .from('volunteers')
    .update({
      weekly_hours_target: Math.round(target * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.volunteerId)
    .eq('tenant_id', tenant.id)
    .eq('is_archived', false)
    .select('weekly_hours_target')
    .maybeSingle();

  if (error) {
    console.error('updateVolunteerWeeklyHoursTarget:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!data) return { ok: false, error: 'not_found' };

  return {
    ok: true,
    weeklyHoursTarget: Number(data.weekly_hours_target),
  };
}

export type MyVolunteerScheduleResult =
  | {
      ok: true;
      volunteer: {
        id: string;
        displayName: string;
        weeklyHoursTarget: number;
      } | null;
      shifts: VolunteerShiftRecord[];
      fromDate: string;
      toDate: string;
      propertyTimeZone: string;
    }
  | { ok: false; error: 'tenant_not_found' | 'db_unavailable' };

/** Read-only schedule for the signed-in reception user (linked volunteer), if any. */
export async function getMyVolunteerScheduleForReception(input: {
  tenantSlug: string;
  receptionUserId: string;
  /** Property-local calendar day to start from (inclusive). */
  fromDate: string;
  /** Number of calendar days to include (default 14). */
  dayCount?: number;
  /** Skip tenant lookup when already resolved by the caller. */
  tenantId?: string;
  propertyTimeZone?: string | null;
}): Promise<MyVolunteerScheduleResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  let tenantId = input.tenantId?.trim() || '';
  let timeZone = normalizePropertyTimeZone(input.propertyTimeZone);

  if (!tenantId) {
    const tenant = await getTenantRecord(input.tenantSlug);
    if (!tenant) return { ok: false, error: 'tenant_not_found' };
    tenantId = tenant.id;
    timeZone = normalizePropertyTimeZone(tenant.settings.propertyTimeZone);
  }

  const fromDate = input.fromDate.trim();
  if (!CALENDAR_DAY_RE.test(fromDate)) {
    return { ok: false, error: 'db_unavailable' };
  }

  const dayCount = Math.min(Math.max(input.dayCount ?? 14, 1), 31);
  const toDate = addStayCalendarDays(fromDate, dayCount - 1);
  const startMs = propertyLocalDateTimeToUtcMs(fromDate, '00:00', timeZone);
  const endExclusiveDay = addStayCalendarDays(toDate, 1);
  const endMs = propertyLocalDateTimeToUtcMs(endExclusiveDay, '00:00', timeZone);
  if (startMs == null || endMs == null) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data: volunteerRow, error: volunteerError } = await admin
    .from('volunteers')
    .select('id, display_name, weekly_hours_target')
    .eq('tenant_id', tenantId)
    .eq('reception_user_id', input.receptionUserId)
    .eq('is_archived', false)
    .maybeSingle();

  if (volunteerError) {
    console.error('getMyVolunteerScheduleForReception volunteer:', volunteerError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!volunteerRow) {
    return {
      ok: true,
      volunteer: null,
      shifts: [],
      fromDate,
      toDate,
      propertyTimeZone: timeZone,
    };
  }

  const volunteerId = String(volunteerRow.id);
  const { data, error } = await admin
    .from('volunteer_shifts')
    .select(SHIFT_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('volunteer_id', volunteerId)
    .gte('starts_at', new Date(startMs).toISOString())
    .lt('starts_at', new Date(endMs).toISOString())
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('getMyVolunteerScheduleForReception shifts:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const shifts = (data ?? [])
    .map((row) => mapShiftRow(row as Record<string, unknown>))
    .filter((row): row is VolunteerShiftRecord => row != null);

  return {
    ok: true,
    volunteer: {
      id: volunteerId,
      displayName: String(volunteerRow.display_name),
      weeklyHoursTarget: Number(volunteerRow.weekly_hours_target ?? 25),
    },
    shifts,
    fromDate,
    toDate,
    propertyTimeZone: timeZone,
  };
}
