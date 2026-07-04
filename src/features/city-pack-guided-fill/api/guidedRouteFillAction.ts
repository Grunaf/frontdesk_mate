'use server';

import { cookies } from 'next/headers';
import { assertAdminAuthenticated } from '@/app/admin/lib/adminSession';
import { checkGuidedFillRateLimit } from '../lib/guidedFillRateLimit';
import { runGuidedRouteFill } from '../lib/runGuidedRouteFill';
import type { GuidedRouteFillRequest, GuidedRouteFillResult } from '../model/types';

const RATE_COOKIE = 'fdm_admin_session';

export async function guidedRouteFillAction(
  input: GuidedRouteFillRequest
): Promise<GuidedRouteFillResult> {
  try {
    await assertAdminAuthenticated();
  } catch {
    return { ok: false, error: 'unauthorized' };
  }

  const cookieStore = await cookies();
  const sessionKey = cookieStore.get(RATE_COOKIE)?.value ?? 'anonymous';
  if (!checkGuidedFillRateLimit(sessionKey)) {
    return { ok: false, error: 'rate_limited' };
  }

  return runGuidedRouteFill(input);
}
