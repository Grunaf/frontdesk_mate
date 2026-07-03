'use server';

import { headers } from 'next/headers';
import {
  activateGuestStayByPin,
  setGuestSessionCookie,
} from '@/entities/guest-stay/server';
import { resolveTenantSlug } from '@/entities/tenant/server';
import { setGuestRegistrationHintCookie } from '@/shared/lib/guestRegistrationHint.server';
import { getRequestClientIp, isPinAttemptRateLimited, recordPinAttemptFailure } from '@/shared/lib/pinRateLimit';

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
      error: 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable' | 'too_many_attempts';
    };

function shouldCountPinFailure(error: string): boolean {
  return error !== 'db_unavailable' && error !== 'too_many_attempts';
}

export async function activateGuestStayByPinAction(
  pin: string,
  _locale: string
): Promise<ActivateGuestStayByPinActionResult> {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    return { ok: false, error: 'invalid_pin' };
  }

  const headerStore = await headers();
  const clientIp = getRequestClientIp(headerStore);

  if (
    await isPinAttemptRateLimited({
      scope: 'guest',
      tenantSlug,
      clientIp,
    })
  ) {
    return { ok: false, error: 'too_many_attempts' };
  }

  const result = await activateGuestStayByPin({ pin, tenantSlug });

  if (!result.ok) {
    if (shouldCountPinFailure(result.error)) {
      await recordPinAttemptFailure({ scope: 'guest', tenantSlug, clientIp });
    }
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
