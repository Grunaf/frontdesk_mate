'use server';

import {
  activateGuestStay,
  setGuestSessionCookie,
} from '@/entities/guest-stay/server';
import { resolveTenantSlug } from '@/entities/tenant/server';
import { setGuestRegistrationHintCookie } from '@/shared/lib/guestRegistrationHint.server';

export type ActivateGuestStayActionResult =
  | {
      ok: true;
      registration: {
        tenantSlug: string;
        bedId: string;
        exp: number;
      };
    }
  | {
      ok: false;
      error: 'invalid_token' | 'expired' | 'revoked' | 'wrong_hostel' | 'db_unavailable' | 'no_tenant';
      correctTenantSlug?: string;
    };

export async function activateGuestStayAction(
  token: string,
  _locale: string
): Promise<ActivateGuestStayActionResult> {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    return { ok: false, error: 'no_tenant' };
  }

  const result = await activateGuestStay({ token, tenantSlug });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      correctTenantSlug: result.correctTenantSlug,
    };
  }

  await setGuestSessionCookie(result.session);
  await setGuestRegistrationHintCookie({
    tenantSlug: result.session.tenantSlug,
    bedId: result.session.bedId,
    exp: result.session.exp,
  });
  return {
    ok: true,
    registration: {
      tenantSlug: result.session.tenantSlug,
      bedId: result.session.bedId,
      exp: result.session.exp,
    },
  };
}
