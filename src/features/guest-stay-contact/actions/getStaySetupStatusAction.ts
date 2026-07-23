'use server';

import { resolveStaySetupStatus } from '../lib/resolveStaySetupStatus';

export async function getStaySetupStatusAction(tenantSlug: string) {
  return resolveStaySetupStatus(tenantSlug);
}
