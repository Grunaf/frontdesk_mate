'use client';

import { createContext, useContext } from 'react';

const GuestRuntimeContext = createContext<{ guestBedId: string | null }>({
  guestBedId: null,
});

export function GuestRuntimeProvider({
  sessionBedId = null,
  children,
}: {
  sessionBedId?: string | null;
  children: React.ReactNode;
}) {
  const guestBedId = sessionBedId?.trim() || null;

  return (
    <GuestRuntimeContext.Provider value={{ guestBedId }}>{children}</GuestRuntimeContext.Provider>
  );
}

export function useGuestRuntimeBedId(): string | null {
  return useContext(GuestRuntimeContext).guestBedId;
}
