'use client';

import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';

interface ReceptionProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountLabel: string;
  tenantName: string;
}

export function ReceptionProfileSheet({
  open,
  onOpenChange,
  accountLabel,
  tenantName,
}: ReceptionProfileSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.small} className="px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle className="text-base">Profile</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody className="space-y-1 px-6 pb-4">
          <p className="text-sm font-medium text-foreground">{accountLabel}</p>
          <p className="text-xs text-muted-foreground">{tenantName}</p>
        </BottomSheetBody>
        <BottomSheetFooter className="border-t border-border/60 px-6 py-4">
          <form method="POST" action="/api/reception/logout" className="w-full">
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
