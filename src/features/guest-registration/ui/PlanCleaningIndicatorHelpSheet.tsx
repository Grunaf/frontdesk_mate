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
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle>Plan help</BottomSheetTitle>
          <BottomSheetDescription className="sr-only">
            Free tonight filter and cleaning indicators on Plan
          </BottomSheetDescription>
        </BottomSheetHeader>
        <BottomSheetBody className="space-y-4 px-6 pb-6 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-medium">Free tonight</p>
            <p className="text-muted-foreground">
              Tap today’s date in the calendar header to show only beds free tonight. Tap again to
              show all beds.
            </p>
          </div>
          <div className="space-y-3">
            <p className="font-medium">Cleaning indicators</p>
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
          </div>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
