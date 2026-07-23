'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useIsGuestRegistered } from '@/features/guest-check-in';
import { useTenant } from '@/entities/tenant';
import { getStaySetupStatusAction } from '../actions/getStaySetupStatusAction';
import type { StaySetupStatus } from '../lib/resolveStaySetupStatus';

export type StaySetupStatusContextValue = {
  status: StaySetupStatus | null;
  statusLoading: boolean;
  revalidate: () => void;
};

const StaySetupStatusContext = createContext<StaySetupStatusContextValue>({
  status: null,
  statusLoading: false,
  revalidate: () => {},
});

type StaySetupStatusProviderProps = {
  children: ReactNode;
  initialStatus?: StaySetupStatus | null;
};

/**
 * App-site stay-setup status: SSR hydrate + client revalidate after mutations / route return.
 */
export function StaySetupStatusProvider({
  children,
  initialStatus = null,
}: StaySetupStatusProviderProps) {
  const pathname = usePathname();
  const { slug } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const shouldFetch = isRegistered && Boolean(slug?.trim());
  const skipFirstFetchRef = useRef(Boolean(initialStatus) && shouldFetch);
  const requestIdRef = useRef(0);
  const statusRef = useRef<StaySetupStatus | null>(initialStatus);

  const [status, setStatus] = useState<StaySetupStatus | null>(initialStatus);
  const [statusLoading, setStatusLoading] = useState(
    () => shouldFetch && initialStatus == null
  );

  statusRef.current = status;

  const runFetch = useCallback(() => {
    if (!shouldFetch || !slug) {
      setStatus(null);
      statusRef.current = null;
      setStatusLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    if (statusRef.current == null) {
      setStatusLoading(true);
    }

    void getStaySetupStatusAction(slug).then((result) => {
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (!result.ok) {
        setStatus(null);
        statusRef.current = null;
        setStatusLoading(false);
        return;
      }
      setStatus(result.status);
      statusRef.current = result.status;
      setStatusLoading(false);
    });
  }, [shouldFetch, slug]);

  const revalidate = useCallback(() => {
    skipFirstFetchRef.current = false;
    runFetch();
  }, [runFetch]);

  useEffect(() => {
    if (!shouldFetch) {
      setStatus(null);
      statusRef.current = null;
      setStatusLoading(false);
      return;
    }

    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      setStatusLoading(false);
      return;
    }

    runFetch();
  }, [shouldFetch, pathname, runFetch]);

  const value = useMemo(
    () => ({
      status,
      statusLoading,
      revalidate,
    }),
    [status, statusLoading, revalidate]
  );

  return (
    <StaySetupStatusContext.Provider value={value}>{children}</StaySetupStatusContext.Provider>
  );
}

export function useStaySetupStatus(): StaySetupStatusContextValue {
  return useContext(StaySetupStatusContext);
}
