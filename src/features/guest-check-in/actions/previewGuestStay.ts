'use server';

import { previewGuestStayByToken } from '@/entities/guest-stay/server';
import type { GuestStayPreview, PreviewGuestStayByTokenResult } from '@/entities/guest-stay/server';
import { resolveTenantSlug } from '@/entities/tenant/server';

export type PreviewGuestStayActionResult =
  | { ok: true; stay: GuestStayPreview }
  | {
      ok: false;
      error: 'invalid_token' | 'expired' | 'revoked' | 'wrong_hostel' | 'db_unavailable' | 'no_tenant';
      correctTenantSlug?: string;
    };

export async function previewGuestStayAction(
  token: string
): Promise<PreviewGuestStayActionResult> {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    return { ok: false, error: 'no_tenant' };
  }

  const result: PreviewGuestStayByTokenResult = await previewGuestStayByToken({
    token,
    tenantSlug,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      correctTenantSlug: result.correctTenantSlug,
    };
  }

  return { ok: true, stay: result.stay };
}
