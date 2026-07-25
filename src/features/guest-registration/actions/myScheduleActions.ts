'use server';

import {
  normalizePropertyTimeZone,
  todayPropertyStayCalendarDay,
} from '@/entities/guest-stay';
import { getTenantRecord } from '@/entities/tenant/server';
import { startOfIsoWeekCalendarDay } from '@/entities/volunteer';
import { getMyVolunteerScheduleForReception } from '@/entities/volunteer/server';
import type { VolunteerShiftRecord } from '@/entities/volunteer';
import { resolveReceptionStaffContext } from '@/features/guest-registration/lib/resolveReceptionStaffContext';

export type LoadMyReceptionScheduleResult =
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
      weekStartMonday: string;
      propertyTimeZone: string;
    }
  | { ok: false; error: 'unauthorized' | 'tenant_not_found' | 'db_unavailable' };

export async function loadMyReceptionScheduleAction(input: {
  tenantSlug: string;
  /** ISO week Monday (YYYY-MM-DD). Defaults to current property-local week. */
  weekStartMonday?: string;
}): Promise<LoadMyReceptionScheduleResult> {
  const [staff, tenant] = await Promise.all([
    resolveReceptionStaffContext(input.tenantSlug),
    getTenantRecord(input.tenantSlug),
  ]);

  if (!staff.ok) {
    return { ok: false, error: 'unauthorized' };
  }
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const propertyTimeZone = normalizePropertyTimeZone(tenant.settings.propertyTimeZone);
  const today = todayPropertyStayCalendarDay(new Date(), propertyTimeZone);
  const weekStart =
    startOfIsoWeekCalendarDay(input.weekStartMonday?.trim() || today) ??
    startOfIsoWeekCalendarDay(today) ??
    today;

  const result = await getMyVolunteerScheduleForReception({
    tenantSlug: input.tenantSlug,
    tenantId: tenant.id,
    propertyTimeZone,
    receptionUserId: staff.ctx.id,
    fromDate: weekStart,
    dayCount: 7,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    weekStartMonday: weekStart,
  };
}
