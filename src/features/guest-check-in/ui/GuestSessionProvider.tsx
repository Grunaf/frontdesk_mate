'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ResolvedGuestSession } from '@/entities/guest-stay';
import {
  isGuestRegistrationIndexValid,
  readGuestRegistrationIndex,
  type GuestRegistrationIndex,
} from '@/shared/lib/guestRegistrationIndex';

export interface GuestSessionContextValue {
  session: ResolvedGuestSession | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  currentTenantSlug: string | null;
  foreignRegistration: GuestRegistrationIndex | null;
  isRegistered: boolean;
}

const GuestSessionContext = createContext<GuestSessionContextValue>({
  session: null,
  checkInAt: null,
  checkOutAt: null,
  currentTenantSlug: null,
  foreignRegistration: null,
  isRegistered: false,
});

export function GuestSessionProvider({
  session,
  currentTenantSlug,
  children,
}: {
  session: ResolvedGuestSession | null;
  currentTenantSlug: string | null;
  children: React.ReactNode;
}) {
  const [foreignRegistration, setForeignRegistration] = useState<GuestRegistrationIndex | null>(null);

  useEffect(() => {
    if (session) {
      setForeignRegistration(null);
      return;
    }

    const index = readGuestRegistrationIndex();
    if (
      currentTenantSlug &&
      isGuestRegistrationIndexValid(index) &&
      index.tenantSlug !== currentTenantSlug
    ) {
      setForeignRegistration(index);
      return;
    }

    setForeignRegistration(null);
  }, [session, currentTenantSlug]);

  const checkInAt = session?.checkInAt ?? null;
  const checkOutAt = session?.checkOutAt ?? null;

  const value = useMemo(
    () => ({
      session,
      checkInAt,
      checkOutAt,
      currentTenantSlug,
      foreignRegistration,
      isRegistered: Boolean(session),
    }),
    [session, checkInAt, checkOutAt, currentTenantSlug, foreignRegistration]
  );

  return <GuestSessionContext.Provider value={value}>{children}</GuestSessionContext.Provider>;
}

export function useGuestSession(): GuestSessionContextValue {
  return useContext(GuestSessionContext);
}

export function useIsGuestRegistered(): boolean {
  return useContext(GuestSessionContext).isRegistered;
}

export function useForeignGuestRegistration(): GuestRegistrationIndex | null {
  return useContext(GuestSessionContext).foreignRegistration;
}
