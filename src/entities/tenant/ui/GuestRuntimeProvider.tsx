'use client';

import { createContext, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { readGuestBedIdFromSearchParams } from '../lib/resolveGuestBedId';

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
  const searchParams = useSearchParams();
  const urlBedId = readGuestBedIdFromSearchParams(searchParams);
  const guestBedId = sessionBedId?.trim() || urlBedId || null;

  return (
    <GuestRuntimeContext.Provider value={{ guestBedId }}>{children}</GuestRuntimeContext.Provider>
  );
}

export function useGuestRuntimeBedId(): string | null {
  return useContext(GuestRuntimeContext).guestBedId;
}
