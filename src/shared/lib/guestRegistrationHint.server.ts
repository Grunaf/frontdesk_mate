import 'server-only';

import { cookies } from 'next/headers';
import { isLocalBaseDomain } from '@/shared/config/site';
import {
  getGuestAppSharedCookieDomain,
  getGuestRegistrationHintMaxAgeSec,
  GUEST_REGISTRATION_HINT_COOKIE,
  serializeGuestRegistrationHint,
  type GuestRegistrationIndex,
} from './guestRegistrationHint';

export async function setGuestRegistrationHintCookie(index: GuestRegistrationIndex): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_REGISTRATION_HINT_COOKIE, serializeGuestRegistrationHint(index), {
    domain: getGuestAppSharedCookieDomain(),
    path: '/',
    maxAge: getGuestRegistrationHintMaxAgeSec(index),
    sameSite: 'lax',
    secure: !isLocalBaseDomain(),
    httpOnly: false,
  });
}

export async function clearGuestRegistrationHintCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_REGISTRATION_HINT_COOKIE, '', {
    domain: getGuestAppSharedCookieDomain(),
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: !isLocalBaseDomain(),
    httpOnly: false,
  });
}
