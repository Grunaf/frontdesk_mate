'use client';

import { useMemo } from 'react';
import type { TenantSettings } from '@/entities/tenant';
import { listStayOffers } from '@/entities/tenant';
import { Button, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
  DEFAULT_PLAN_QUICK_FILTERS,
  PLAN_QUICK_FILTER_ALL,
  isPlanQuickFiltersActive,
  listPlanFloorFilterOptions,
  listPlanRoomFilterOptions,
  type PlanQuickFiltersState,
} from '../lib/filterPlanRoomGroupsByQuickFilters';
import { PlanFilterField } from './PlanFilterField';

export interface PlanQuickFiltersBarProps {
  settings: TenantSettings;
  filters: PlanQuickFiltersState;
  onFiltersChange: (next: PlanQuickFiltersState) => void;
  /** Room groups before quick filters (after inventory/calendar). */
  totalRoomCount: number;
  /** Room groups after quick filters. */
  visibleRoomCount: number;
  className?: string;
}

export function PlanQuickFiltersBar({
  settings,
  filters,
  onFiltersChange,
  totalRoomCount,
  visibleRoomCount,
  className,
}: PlanQuickFiltersBarProps) {
  const floors = useMemo(() => listPlanFloorFilterOptions(settings), [settings]);
  const offers = useMemo(() => listStayOffers(settings), [settings]);
  const roomOptions = useMemo(
    () => listPlanRoomFilterOptions(settings, filters),
    [filters, settings]
  );

  const filtersActive = isPlanQuickFiltersActive(filters);
  const hiddenRoomCount = Math.max(0, totalRoomCount - visibleRoomCount);

  const floorItems = useMemo(
    () => [
      { id: PLAN_QUICK_FILTER_ALL, label: 'All' },
      ...floors.map((floor) => ({ id: floor.id, label: floor.label })),
    ],
    [floors]
  );

  const offerItems = useMemo(
    () => [
      { id: PLAN_QUICK_FILTER_ALL, label: 'All' },
      ...offers.map((offer) => ({ id: offer.id, label: offer.title })),
    ],
    [offers]
  );

  const patch = (partial: Partial<PlanQuickFiltersState>) => {
    const next: PlanQuickFiltersState = { ...filters, ...partial };

    if (partial.floorId !== undefined || partial.offerId !== undefined) {
      const narrowed = listPlanRoomFilterOptions(settings, next);
      if (
        next.roomId !== PLAN_QUICK_FILTER_ALL &&
        !narrowed.some((room) => room.roomId === next.roomId)
      ) {
        next.roomId = PLAN_QUICK_FILTER_ALL;
      }
    }

    onFiltersChange(next);
  };

  const showFloorRow = floors.length > 0;
  const showOfferRow = offers.length > 0;

  return (
    <div
      className={cn(
        'space-y-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5',
        className
      )}
    >
      {showFloorRow ? (
        <PlanFilterField label="Floor">
          <SegmentedChipBar
            ariaLabel="Filter by floor"
            items={floorItems}
            value={filters.floorId}
            onValueChange={(id) => patch({ floorId: id })}
            bleed={false}
            className="min-w-0"
          />
        </PlanFilterField>
      ) : null}

      {showOfferRow ? (
        <PlanFilterField label="Stay offer">
          <SegmentedChipBar
            ariaLabel="Filter by stay offer"
            items={offerItems}
            value={filters.offerId}
            onValueChange={(id) => patch({ offerId: id })}
            bleed={false}
            className="min-w-0"
          />
        </PlanFilterField>
      ) : null}

      <PlanFilterField label="Room" htmlFor="plan-quick-filter-room">
        <div className="flex flex-wrap items-center gap-2">
          <select
            id="plan-quick-filter-room"
            value={filters.roomId}
            onChange={(event) => patch({ roomId: event.target.value })}
            className="h-9 min-w-[10rem] max-w-full rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value={PLAN_QUICK_FILTER_ALL}>All rooms</option>
            {roomOptions.map((room) => (
              <option key={room.roomId} value={room.roomId}>
                {room.label}
              </option>
            ))}
          </select>

          {filtersActive ? (
            <>
              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                Showing {visibleRoomCount} of {totalRoomCount} rooms
                {hiddenRoomCount > 0 ? ` · ${hiddenRoomCount} hidden` : ''}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onFiltersChange({ ...DEFAULT_PLAN_QUICK_FILTERS })}
              >
                Reset filters
              </Button>
            </>
          ) : null}
        </div>
      </PlanFilterField>
    </div>
  );
}
