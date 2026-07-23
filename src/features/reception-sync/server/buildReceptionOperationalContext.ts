import 'server-only';

import { listGuestHubTransfers } from '@/entities/guest-hub-transfer/server';
import { listGuestIssues } from '@/entities/guest-issue/server';
import { listActiveGuestStays, listPlanGuestReservations } from '@/entities/guest-stay/server';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  resolveOperationalDay,
  resolveOperationalDayStartTime,
} from '@/features/guest-registration/lib/resolveOperationalDay';
import { resolveReceptionStaffContext } from '@/features/guest-registration/lib/resolveReceptionStaffContext';
import type { ReceptionOperationalContext } from '../model/receptionOperationalContext';

export async function buildReceptionOperationalContext(
  tenantSlug: string,
  locale = 'en'
): Promise<ReceptionOperationalContext> {
  const now = new Date();

  const [tenant, stays, planStays, openIssues, openTransfers, staff] = await Promise.all([
    getTenantRecord(tenantSlug),
    listActiveGuestStays(tenantSlug, locale),
    listPlanGuestReservations(tenantSlug, locale),
    listGuestIssues(tenantSlug, 'open'),
    listGuestHubTransfers(tenantSlug, 'open'),
    resolveReceptionStaffContext(tenantSlug),
  ]);

  const operationalDayStartTime = resolveOperationalDayStartTime(tenant?.settings);
  const operationalWindow = resolveOperationalDay(now, operationalDayStartTime);

  return {
    generatedAt: now.toISOString(),
    operationalDayStartTime,
    operational: {
      operationalDate: operationalWindow.operationalDate,
      startsAt: operationalWindow.startsAt.toISOString(),
      endsAt: operationalWindow.endsAt.toISOString(),
    },
    stays,
    planStays,
    openIssues,
    openTransfers,
    staffPermissions: staff.ok ? staff.ctx.permissions : [],
  };
}
