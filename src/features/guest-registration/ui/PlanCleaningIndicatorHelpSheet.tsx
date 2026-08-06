'use client';

import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/shared/ui';

export function PlanCleaningIndicatorHelpSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.small} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle>Cleaning indicators</BottomSheetTitle>
          <BottomSheetDescription className="sr-only">
            What the yellow bed dots mean on Plan
          </BottomSheetDescription>
        </BottomSheetHeader>
        <BottomSheetBody className="space-y-3 px-6 pb-6 text-sm text-foreground">
          <p className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500"
            />
            <span>
              A yellow dot means the bed still needs cleaning work (not ready yet) — status unset,
              needs strip, or stripped.
            </span>
          </p>
          <p className="text-muted-foreground">
            Ready beds show no dot. Update cleaning status in the Cleaning tab (Strip → Make →
            Ready). Plan only shows the signal; it does not change status.
          </p>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
