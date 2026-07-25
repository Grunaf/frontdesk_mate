'use server';

import { revalidatePath } from 'next/cache';

import {
  assertOwnerAuthenticated,
  getOwnerTenantContext,
} from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import {
  createVolunteerShift,
  createVolunteerShiftsBulk,
  deleteVolunteerShift,
  updateVolunteerShift,
  updateVolunteerWeeklyHoursTarget,
} from '@/entities/volunteer/server';

async function resolveOwnerWriter(): Promise<
  | { ok: true; slug: string }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  await assertOwnerAuthenticated();
  const context = await getOwnerTenantContext();
  if (!context) {
    return { ok: false, error: 'unauthorized' };
  }

  const access = resolveOwnerEditAccess(context.lifecycleStatus);
  if (!access.canEditSettings) {
    return { ok: false, error: 'forbidden' };
  }

  return { ok: true, slug: context.slug };
}

function revalidateSchedule(locale: string) {
  revalidatePath(`/${locale}/schedule`);
}

export async function createVolunteerShiftAction(input: {
  locale: string;
  volunteerId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}) {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false as const, error: actor.error };
  }

  const result = await createVolunteerShift({
    tenantSlug: actor.slug,
    volunteerId: input.volunteerId,
    workDate: input.workDate,
    startTime: input.startTime,
    endTime: input.endTime,
    notes: input.notes,
  });

  if (!result.ok) {
    return result;
  }

  revalidateSchedule(input.locale);
  return { ok: true as const, shiftId: result.shift.id };
}

export async function createVolunteerShiftsBulkAction(input: {
  locale: string;
  volunteerId: string;
  workDates: string[];
  startTime: string;
  endTime: string;
  conflictPolicy?: 'skip' | 'overwrite';
  notes?: string;
}) {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false as const, error: actor.error };
  }

  const result = await createVolunteerShiftsBulk({
    tenantSlug: actor.slug,
    volunteerId: input.volunteerId,
    workDates: input.workDates,
    startTime: input.startTime,
    endTime: input.endTime,
    conflictPolicy: input.conflictPolicy,
    notes: input.notes,
  });

  if (!result.ok) {
    return result;
  }

  revalidateSchedule(input.locale);
  return {
    ok: true as const,
    createdCount: result.created.length,
    skippedCount: result.skippedDates.length,
    overwrittenCount: result.overwrittenDates.length,
  };
}

export async function updateVolunteerShiftAction(input: {
  locale: string;
  shiftId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
}) {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false as const, error: actor.error };
  }

  const result = await updateVolunteerShift({
    tenantSlug: actor.slug,
    shiftId: input.shiftId,
    workDate: input.workDate,
    startTime: input.startTime,
    endTime: input.endTime,
    notes: input.notes,
  });

  if (!result.ok) {
    return result;
  }

  revalidateSchedule(input.locale);
  return { ok: true as const, shiftId: result.shift.id };
}

export async function deleteVolunteerShiftAction(input: {
  locale: string;
  shiftId: string;
}) {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false as const, error: actor.error };
  }

  const result = await deleteVolunteerShift({
    tenantSlug: actor.slug,
    shiftId: input.shiftId,
  });

  if (!result.ok) {
    return result;
  }

  revalidateSchedule(input.locale);
  return { ok: true as const };
}

export async function updateVolunteerWeeklyHoursTargetAction(input: {
  locale: string;
  volunteerId: string;
  weeklyHoursTarget: number;
}) {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false as const, error: actor.error };
  }

  const result = await updateVolunteerWeeklyHoursTarget({
    tenantSlug: actor.slug,
    volunteerId: input.volunteerId,
    weeklyHoursTarget: input.weeklyHoursTarget,
  });

  if (!result.ok) {
    return result;
  }

  revalidateSchedule(input.locale);
  return { ok: true as const, weeklyHoursTarget: result.weeklyHoursTarget };
}
