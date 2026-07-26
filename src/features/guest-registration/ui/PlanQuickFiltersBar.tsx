'use client';

import { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { TenantSettings } from '@/entities/tenant';
import { listStayOffers } from '@/entities/tenant';
import { Button, Icon, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
  DEFAULT_PLAN_QUICK_FILTERS,
  PLAN_QUICK_FILTER_ALL,
  isPlanQuickFiltersActive,
  listPlanFloorFilterOptions,
  listPlanRoomFilterOptions,
  type PlanQuickFiltersState,
} from '../lib/filterPlanRoomGroupsByQuickFilters';

export interface PlanQuickFiltersBarProps {
  settings: TenantSettings;
  filters: PlanQuickFiltersState;
  onFiltersChange: (next: PlanQuickFiltersState) => void;
  /** Room groups before quick filters (after inventory/calendar). */
  totalRoomCount: number;
  /** Room groups after quick filters (before Free beds). */
  visibleRoomCount: number;
  freeBedsFilterOn: boolean;
  onToggleFreeBeds: () => void;
}

export function PlanQuickFiltersBar({
  settings,
  filters,
  onFiltersChange,
  totalRoomCount,
  visibleRoomCount,
  freeBedsFilterOn,
  onToggleFreeBeds,
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
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <div className="space-y-1">
        <span className="text-[11px] text-muted-foreground">Availability</span>
        <button
          type="button"
          aria-pressed={freeBedsFilterOn}
          onClick={onToggleFreeBeds}
          className={cn(
            'inline-flex h-auto min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors',
            freeBedsFilterOn
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm border',
              freeBedsFilterOn
                ? 'border-primary-foreground/80 bg-primary-foreground text-primary'
                : 'border-muted-foreground/50 bg-background'
            )}
          >
            {freeBedsFilterOn ? <Icon icon={Check} className="size-2.5" size={10} /> : null}
          </span>
          Free beds
        </button>
      </div>

      {showFloorRow ? (
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Floor</span>
          <SegmentedChipBar
            ariaLabel="Filter by floor"
            items={floorItems}
            value={filters.floorId}
            onValueChange={(id) => patch({ floorId: id })}
            className="min-w-0"
          />
        </div>
      ) : null}

      {showOfferRow ? (
        <div className="space-y-1">
          <span className="text-[11px] text-muted-foreground">Stay offer</span>
          <SegmentedChipBar
            ariaLabel="Filter by stay offer"
            items={offerItems}
            value={filters.offerId}
            onValueChange={(id) => patch({ offerId: id })}
            className="min-w-0"
          />
        </div>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor="plan-quick-filter-room"
          className="text-[11px] text-muted-foreground"
        >
          Room
        </label>
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
      </div>
    </div>
  );
}
