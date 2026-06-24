'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface GuestIssueReportContextValue {
  openReportSheet: () => void;
}

const GuestIssueReportContext = createContext<GuestIssueReportContextValue>({
  openReportSheet: () => {},
});

export function GuestIssueReportProvider({
  children,
  renderSheet,
}: {
  children: ReactNode;
  renderSheet: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openReportSheet = useCallback(() => {
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openReportSheet }), [openReportSheet]);

  return (
    <GuestIssueReportContext.Provider value={value}>
      {children}
      {renderSheet({ open, onOpenChange: setOpen })}
    </GuestIssueReportContext.Provider>
  );
}

export function useGuestIssueReport(): GuestIssueReportContextValue {
  return useContext(GuestIssueReportContext);
}
