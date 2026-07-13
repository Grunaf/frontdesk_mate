import 'server-only';

import { listGuestHubTransfers } from '@/entities/guest-hub-transfer/server';
import { listGuestIssues } from '@/entities/guest-issue/server';
import { listActiveGuestStays } from '@/entities/guest-stay/server';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  resolveOperationalDay,
  resolveOperationalDayStartTime,
} from '@/features/guest-registration/lib/resolveOperationalDay';
import type { ReceptionOperationalContext } from '../model/receptionOperationalContext';

export async function buildReceptionOperationalContext(
  tenantSlug: string,
  locale = 'en'
): Promise<ReceptionOperationalContext> {
  const now = new Date();

  const [tenant, stays, openIssues, openTransfers] = await Promise.all([
    getTenantRecord(tenantSlug),
    listActiveGuestStays(tenantSlug, locale),
    listGuestIssues(tenantSlug, 'open'),
    listGuestHubTransfers(tenantSlug, 'open'),
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
    openIssues,
    openTransfers,
  };
}
