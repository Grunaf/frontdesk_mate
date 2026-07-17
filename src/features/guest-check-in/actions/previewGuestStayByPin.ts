'use server';

import { previewGuestStayByPin } from '@/entities/guest-stay/server';
import type { GuestStayPreview, PreviewGuestStayByPinResult } from '@/entities/guest-stay/server';
import { resolveTenantSlug } from '@/entities/tenant/server';

export type PreviewGuestStayByPinActionResult =
  | { ok: true; stay: GuestStayPreview }
  | {
      ok: false;
      error: 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable' | 'no_tenant';
    };

export async function previewGuestStayByPinAction(
  pin: string
): Promise<PreviewGuestStayByPinActionResult> {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    return { ok: false, error: 'no_tenant' };
  }

  const result: PreviewGuestStayByPinResult = await previewGuestStayByPin({
    pin,
    tenantSlug,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, stay: result.stay };
}
