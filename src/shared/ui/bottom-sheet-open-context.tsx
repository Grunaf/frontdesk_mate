'use client';

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type ReactNode,
} from 'react';

interface BottomSheetOpenContextValue {
  openCount: number;
  registerOpen: (id: string, open: boolean) => void;
}

const BottomSheetOpenContext = createContext<BottomSheetOpenContextValue>({
  openCount: 0,
  registerOpen: () => {},
});

export function BottomSheetOpenProvider({ children }: { children: ReactNode }) {
  const openIdsRef = useRef(new Set<string>());
  const [version, setVersion] = useState(0);

  const registerOpen = useCallback((id: string, open: boolean) => {
    const current = openIdsRef.current;

    if (open) {
      if (current.has(id)) {
        return;
      }

      current.add(id);
    } else {
      if (!current.has(id)) {
        return;
      }

      current.delete(id);
    }

    setVersion((currentVersion) => currentVersion + 1);
  }, []);

  const value = useMemo(
    () => ({
      openCount: openIdsRef.current.size,
      registerOpen,
    }),
    [registerOpen, version]
  );

  return (
    <BottomSheetOpenContext.Provider value={value}>{children}</BottomSheetOpenContext.Provider>
  );
}

export function useBottomSheetOpenCount(): number {
  return useContext(BottomSheetOpenContext).openCount;
}

export function useRegisterBottomSheetOpen(open: boolean | undefined): void {
  const id = useId();
  const { registerOpen } = useContext(BottomSheetOpenContext);

  useLayoutEffect(() => {
    if (open !== true) {
      return;
    }

    registerOpen(id, true);
    return () => registerOpen(id, false);
  }, [id, open, registerOpen]);
}
