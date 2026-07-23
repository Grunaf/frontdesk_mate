'use client';

import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/shared/ui';
import {
  ReceptionTourismGuestIdentityForm,
  type ReceptionTourismGuestIdentityValues,
} from './ReceptionTourismGuestIdentityForm';

type ReceptionAddTourismGuestSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInDate: string;
  isPending?: boolean;
  error?: string | null;
  onSubmit: (values: ReceptionTourismGuestIdentityValues) => void;
};

export function ReceptionAddTourismGuestSheet({
  open,
  onOpenChange,
  checkInDate,
  isPending = false,
  error = null,
  onSubmit,
}: ReceptionAddTourismGuestSheetProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending && !nextOpen) {
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange} dismissible={!isPending}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle>Add guest</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody className="space-y-3 pb-4">
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {open ? (
            <ReceptionTourismGuestIdentityForm
              key="reception-add-tourism-guest"
              checkInDate={checkInDate}
              submitLabel="Add guest"
              pendingLabel="Adding…"
              disabled={isPending}
              isPending={isPending}
              onCancel={() => onOpenChange(false)}
              onSubmit={onSubmit}
            />
          ) : null}
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
