'use server';

import { cookies } from 'next/headers';
import { assertAdminAuthenticated } from '@/app/admin/lib/adminSession';
import { checkGuidedFillRateLimit } from '@/features/city-pack-guided-fill';
import { runGuidedTenantLastMileFill } from '../lib/runGuidedTenantLastMileFill';
import type { TenantLastMileFillRequest, TenantLastMileFillResult } from '../model/types';

const RATE_COOKIE = 'fdm_admin_session';

export async function guidedTenantLastMileFillAction(
  input: TenantLastMileFillRequest
): Promise<TenantLastMileFillResult> {
  try {
    await assertAdminAuthenticated();
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  const cookieStore = await cookies();
  const sessionKey = cookieStore.get(RATE_COOKIE)?.value ?? 'anonymous';
  if (!checkGuidedFillRateLimit(`tenant:${sessionKey}`)) {
    return { ok: false, error: 'rate_limited' };
  }

  return runGuidedTenantLastMileFill(input);
}
