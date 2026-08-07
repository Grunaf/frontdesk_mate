'use client';

import type { TenantSettings } from '@/entities/tenant';
import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import type { PlanQuickFiltersState } from '../lib/filterPlanRoomGroupsByQuickFilters';
import { PlanQuickFiltersBar } from './PlanQuickFiltersBar';
import { useIsReceptionStayDetailBelowLg } from './ReceptionStayDetailShell';

function FiltersBar({
  settings,
  filters,
  onFiltersChange,
  totalRoomCount,
  visibleRoomCount,
}: {
  settings: TenantSettings;
  filters: PlanQuickFiltersState;
  onFiltersChange: (next: PlanQuickFiltersState) => void;
  totalRoomCount: number;
  visibleRoomCount: number;
}) {
  return (
    <PlanQuickFiltersBar
      settings={settings}
      filters={filters}
      onFiltersChange={onFiltersChange}
      totalRoomCount={totalRoomCount}
      visibleRoomCount={visibleRoomCount}
      className="border-0 bg-transparent p-0"
    />
  );
}

/** Filters overlay: BottomSheet on `<lg`, centered Dialog on `lg+`. */
export function PlanQuickFiltersDialog({
  open,
  onOpenChange,
  settings,
  filters,
  onFiltersChange,
  totalRoomCount,
  visibleRoomCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: TenantSettings;
  filters: PlanQuickFiltersState;
  onFiltersChange: (next: PlanQuickFiltersState) => void;
  totalRoomCount: number;
  visibleRoomCount: number;
}) {
  const isBelowLg = useIsReceptionStayDetailBelowLg();

  const bar = (
    <FiltersBar
      settings={settings}
      filters={filters}
      onFiltersChange={onFiltersChange}
      totalRoomCount={totalRoomCount}
      visibleRoomCount={visibleRoomCount}
    />
  );

  if (isBelowLg) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange}>
        <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col px-0 pb-0">
          <BottomSheetHeader className="px-6 pb-3">
            <BottomSheetTitle>Filters</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody className="px-6 pb-4">{bar}</BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="gap-0 p-0">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
        </DialogHeader>
        <DialogBody>{bar}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}
