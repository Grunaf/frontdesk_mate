'use server';

import {
  activateGuestStayByPin,
  setGuestSessionCookie,
} from '@/entities/guest-stay/server';
import { resolveTenantSlug } from '@/entities/tenant/server';
import { setGuestRegistrationHintCookie } from '@/shared/lib/guestRegistrationHint.server';

export type ActivateGuestStayByPinActionResult =
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
      error: 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable';
    };

export async function activateGuestStayByPinAction(
  pin: string,
  _locale: string
): Promise<ActivateGuestStayByPinActionResult> {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    return { ok: false, error: 'invalid_pin' };
  }

  const result = await activateGuestStayByPin({ pin, tenantSlug });

  if (!result.ok) {
    return { ok: false, error: result.error };
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
