'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface BottomSheetOpenContextValue {
  openCount: number;
  notifyOpenChange: (open: boolean) => void;
}

const BottomSheetOpenContext = createContext<BottomSheetOpenContextValue>({
  openCount: 0,
  notifyOpenChange: () => {},
});

export function BottomSheetOpenProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);

  const notifyOpenChange = useCallback((open: boolean) => {
    setOpenCount((current) => {
      if (open) {
        return current + 1;
      }

      return Math.max(0, current - 1);
    });
  }, []);

  const value = useMemo(
    () => ({
      openCount,
      notifyOpenChange,
    }),
    [notifyOpenChange, openCount]
  );

  return (
    <BottomSheetOpenContext.Provider value={value}>{children}</BottomSheetOpenContext.Provider>
  );
}

export function useBottomSheetOpenCount(): number {
  return useContext(BottomSheetOpenContext).openCount;
}

export function useBottomSheetOpenNotifier(): (open: boolean) => void {
  return useContext(BottomSheetOpenContext).notifyOpenChange;
}
