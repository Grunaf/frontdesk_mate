'use client';

import { Suspense } from 'react';
import type { ResolvedGuestSession } from '@/entities/guest-stay';
import { GuestSessionProvider } from '@/features/guest-check-in';
import { GuestIssueReportHost } from '@/features/guest-issue-report';
import { BottomSheetOpenProvider } from '@/shared/ui/bottom-sheet-open-context';
import { RoutePendingProvider } from '@/shared/ui';
import { GuestRuntimeProvider } from './GuestRuntimeProvider';

interface GuestAppRuntimeProps {
  children: React.ReactNode;
  sessionBedId?: string | null;
  session?: ResolvedGuestSession | null;
  currentTenantSlug?: string | null;
}

export function GuestAppRuntime({
  children,
  sessionBedId = null,
  session = null,
  currentTenantSlug = null,
}: GuestAppRuntimeProps) {
  return (
    <GuestSessionProvider session={session} currentTenantSlug={currentTenantSlug}>
      <RoutePendingProvider>
        <BottomSheetOpenProvider>
          <GuestIssueReportHost>
            <Suspense fallback={null}>
              <GuestRuntimeProvider sessionBedId={sessionBedId}>{children}</GuestRuntimeProvider>
            </Suspense>
          </GuestIssueReportHost>
        </BottomSheetOpenProvider>
      </RoutePendingProvider>
    </GuestSessionProvider>
  );
}
