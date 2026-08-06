'use client';

import type { TenantSettings } from '@/entities/tenant';
import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/shared/ui';
import type { PlanQuickFiltersState } from '../lib/filterPlanRoomGroupsByQuickFilters';
import { PlanQuickFiltersBar } from './PlanQuickFiltersBar';

export function PlanQuickFiltersSheet({
  open,
  onOpenChange,
  settings,
  filters,
  onFiltersChange,
  totalRoomCount,
  visibleRoomCount,
  freeBedsFilterOn,
  onToggleFreeBeds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: TenantSettings;
  filters: PlanQuickFiltersState;
  onFiltersChange: (next: PlanQuickFiltersState) => void;
  totalRoomCount: number;
  visibleRoomCount: number;
  freeBedsFilterOn: boolean;
  onToggleFreeBeds: () => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle>Filters</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody className="px-6 pb-4">
          <PlanQuickFiltersBar
            settings={settings}
            filters={filters}
            onFiltersChange={onFiltersChange}
            totalRoomCount={totalRoomCount}
            visibleRoomCount={visibleRoomCount}
            freeBedsFilterOn={freeBedsFilterOn}
            onToggleFreeBeds={onToggleFreeBeds}
            className="border-0 bg-transparent p-0"
          />
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
