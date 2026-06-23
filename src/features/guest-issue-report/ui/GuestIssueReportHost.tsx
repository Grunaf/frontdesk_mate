'use client';

import { GuestIssueReportProvider } from './GuestIssueReportProvider';
import { GuestIssueReportSheet } from './GuestIssueReportSheet';

export function GuestIssueReportHost({ children }: { children: React.ReactNode }) {
  return (
    <GuestIssueReportProvider
      renderSheet={({ open, onOpenChange }) => (
        <GuestIssueReportSheet open={open} onOpenChange={onOpenChange} />
      )}
    >
      {children}
    </GuestIssueReportProvider>
  );
}
