'use client';

import { useEffect } from 'react';
import type { ResolvedGuestExtra } from '@/entities/guest-extra';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/shared/ui';
import {
  GuestExtraDetailsActions,
  GuestExtraDetailsBody,
  trackGuestExtraDetailsOpen,
  useGuestExtraDetails,
} from './GuestExtraDetails';

interface GuestExtraSheetProps {
  extra: ResolvedGuestExtra | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bedLabel: string;
  stayRef: string | null;
}

export function GuestExtraSheet({
  extra,
  open,
  onOpenChange,
  bedLabel,
  stayRef,
}: GuestExtraSheetProps) {
  const details = useGuestExtraDetails({ extra, bedLabel, stayRef });

  useEffect(() => {
    if (open && details) {
      trackGuestExtraDetailsOpen(details.presetId);
    }
  }, [open, details]);

  if (!details) {
    return null;
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={details.preferredSheetSize}>
        <BottomSheetHeader>
          <BottomSheetTitle>{details.title}</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody>
          <GuestExtraDetailsBody details={details} />
        </BottomSheetBody>
        {details.hasActions ? (
          <BottomSheetFooter>
            <GuestExtraDetailsActions details={details} />
          </BottomSheetFooter>
        ) : null}
      </BottomSheetContent>
    </BottomSheet>
  );
}
