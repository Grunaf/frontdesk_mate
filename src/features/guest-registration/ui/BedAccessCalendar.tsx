'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  HOUSEKEEPING_BED_STATUSES,
  HOUSEKEEPING_ROOM_STATUSES,
  type HousekeepingBedStatus,
  type HousekeepingRoomStatus,
} from '@/entities/housekeeping';
import type { TenantSettings } from '@/entities/tenant';
import {
  formatCalendarRangeLabel,
  resolveBedDayCalendar,
  shiftCalendarAnchor,
  type BedDayCalendarView,
} from '../lib/resolveBedDayCalendar';
import {
  filterPlanRoomGroupsByFreeTonight,
  type PlanBedFilter,
} from '../lib/filterPlanRoomGroupsByFreeTonight';
import { todayUtcDate } from '../lib/guestAccessDates';
import {
  planStayLifecycleStatusLabel,
  resolvePlanStayLifecycleStatus,
  type PlanStayLifecycleStatus,
} from '../lib/resolvePlanStayLifecycleStatus';
import { Button, Icon, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

interface BedAccessCalendarProps {
  settings: TenantSettings;
  stays: GuestStayRecordWithLink[];
  onViewStay: (stayId: string) => void;
  onSelectFreeNight: (bedId: string, nightDate: string) => void;
  embedded?: boolean;
  bedStatuses?: Record<string, HousekeepingBedStatus>;
  roomStatuses?: Record<string, HousekeepingRoomStatus>;
  onSetBedStatus?: (bedId: string, status: HousekeepingBedStatus) => void;
  onSetRoomStatus?: (roomId: string, status: HousekeepingRoomStatus) => void;
  housekeepingBusy?: boolean;
  /** When true, show arrival/in/leaving/late chips on today's occupied cells. */
  planStayStatusEnabled?: boolean;
  /** Operational / Plan “today” column (YYYY-MM-DD). Defaults to UTC calendar today. */
  planToday?: string;
  bedFilter?: PlanBedFilter;
  onBedFilterChange?: (filter: PlanBedFilter) => void;
  /** Increment to snap the calendar anchor to plan today (e.g. Desk → Free). */
  focusToken?: number;
}

const VIEW_ITEMS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
] as const;

const BED_STATUS_LABELS: Record<HousekeepingBedStatus, string> = {
  ready: 'Ready',
  waiting_linen: 'Waiting linen',
  no_linen: 'No linen',
};

const ROOM_STATUS_LABELS: Record<HousekeepingRoomStatus, string> = {
  cleaned: 'Cleaned',
  not_cleaned: 'Not cleaned',
};

function lifecycleChipClass(status: PlanStayLifecycleStatus): string {
  switch (status) {
    case 'late':
      return 'border-destructive/40 bg-destructive/15 text-destructive';
    case 'arrival':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'leaving':
      return 'border-border bg-muted text-foreground';
    case 'checked_in':
      return 'border-transparent bg-primary/15 text-foreground';
  }
}

function formatDayHeader(nightDate: string, isToday: boolean): string {
  const date = new Date(`${nightDate}T00:00:00.000Z`);
  const label = date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
  return isToday ? `${label} · Today` : label;
}

function useIsMobileCalendar(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function nextBedStatus(current: HousekeepingBedStatus | undefined): HousekeepingBedStatus {
  if (!current) return HOUSEKEEPING_BED_STATUSES[0];
  const index = HOUSEKEEPING_BED_STATUSES.indexOf(current);
  return HOUSEKEEPING_BED_STATUSES[(index + 1) % HOUSEKEEPING_BED_STATUSES.length];
}

function nextRoomStatus(current: HousekeepingRoomStatus | undefined): HousekeepingRoomStatus {
  if (!current) return HOUSEKEEPING_ROOM_STATUSES[0];
  const index = HOUSEKEEPING_ROOM_STATUSES.indexOf(current);
  return HOUSEKEEPING_ROOM_STATUSES[(index + 1) % HOUSEKEEPING_ROOM_STATUSES.length];
}

function isSyntheticRoomId(roomId: string): boolean {
  return roomId.startsWith('__');
}

function bedStatusNeedsWork(status: HousekeepingBedStatus): boolean {
  return status === 'waiting_linen' || status === 'no_linen';
}

function roomStatusNeedsWork(status: HousekeepingRoomStatus): boolean {
  return status === 'not_cleaned';
}

function HousekeepingChip({
  label,
  needsWork,
  unset,
  disabled,
  onClick,
}: {
  label: string;
  needsWork: boolean;
  unset: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight transition-colors',
        unset && 'border-border bg-background text-muted-foreground hover:bg-muted/40',
        !unset && needsWork && 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
        !unset && !needsWork && 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      {label}
    </button>
  );
}

export function BedAccessCalendar({
  settings,
  stays,
  onViewStay,
  onSelectFreeNight,
  embedded = false,
  bedStatuses,
  roomStatuses,
  onSetBedStatus,
  onSetRoomStatus,
  housekeepingBusy = false,
  planStayStatusEnabled = false,
  planToday,
  bedFilter = 'all',
  onBedFilterChange,
  focusToken,
}: BedAccessCalendarProps) {
  const isMobile = useIsMobileCalendar();
  const [view, setView] = useState<BedDayCalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(todayUtcDate());
  const [internalBedFilter, setInternalBedFilter] = useState<PlanBedFilter>('all');

  const effectiveView = isMobile && view === 'month' ? 'week' : view;
  const housekeepingEnabled = Boolean(onSetBedStatus || onSetRoomStatus);
  const lifecycleToday = planToday ?? todayUtcDate();
  const effectiveBedFilter = onBedFilterChange ? bedFilter : internalBedFilter;

  const snapAnchorToPlanToday = () => {
    setAnchorDate(lifecycleToday);
  };

  useEffect(() => {
    if (!focusToken) return;
    setAnchorDate(lifecycleToday);
  }, [focusToken, lifecycleToday]);

  const snapshot = useMemo(
    () => resolveBedDayCalendar(settings, stays, effectiveView, anchorDate),
    [anchorDate, effectiveView, settings, stays]
  );

  const visibleRoomGroups = useMemo(() => {
    if (effectiveBedFilter !== 'free_tonight') return snapshot.roomGroups;
    return filterPlanRoomGroupsByFreeTonight(snapshot.roomGroups, lifecycleToday);
  }, [effectiveBedFilter, lifecycleToday, snapshot.roomGroups]);

  const planBedIds = useMemo(
    () => snapshot.roomGroups.flatMap((group) => group.rows.map((row) => row.bedId)),
    [snapshot.roomGroups]
  );

  const showHousekeepingBanner =
    housekeepingEnabled &&
    planBedIds.length > 0 &&
    planBedIds.some((bedId) => !bedStatuses?.[bedId]);

  const handleBedFilterChange = (next: PlanBedFilter) => {
    if (onBedFilterChange) {
      onBedFilterChange(next);
    } else {
      setInternalBedFilter(next);
    }
    if (next === 'free_tonight') {
      snapAnchorToPlanToday();
    }
  };

  const freeBedsFilterOn = effectiveBedFilter === 'free_tonight';
  const toggleFreeBedsFilter = () => {
    handleBedFilterChange(freeBedsFilterOn ? 'all' : 'free_tonight');
  };

  if (snapshot.roomGroups.length === 0) {
    return <p className="text-xs text-muted-foreground">No beds to show on the calendar.</p>;
  }

  const rangeLabel = formatCalendarRangeLabel(snapshot.rangeStart, snapshot.rangeEnd);
  const viewItems = isMobile ? VIEW_ITEMS.filter((item) => item.id === 'week') : [...VIEW_ITEMS];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedChipBar
          ariaLabel="Calendar view"
          items={viewItems}
          value={effectiveView}
          onValueChange={(id) => {
            setView(id as BedDayCalendarView);
            setAnchorDate(todayUtcDate());
          }}
          className="min-w-0"
        />
        <button
          type="button"
          aria-pressed={freeBedsFilterOn}
          onClick={toggleFreeBedsFilter}
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, -1))}
        >
          Prev
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={snapAnchorToPlanToday}>
          Today
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, 1))}
        >
          Next
        </Button>
        <span className="text-xs text-muted-foreground">{rangeLabel}</span>
      </div>

      {showHousekeepingBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs text-foreground">Set cleaning status for all beds</p>
          <span className="text-[11px] text-muted-foreground">Tap Set… on each bed</span>
        </div>
      ) : null}

      {!embedded ? (
        <p className="text-xs text-muted-foreground">
          Click a guest cell to open their access card. Click a free cell to prefill the issue form.
        </p>
      ) : null}

      {effectiveBedFilter === 'free_tonight' && visibleRoomGroups.length === 0 ? (
        <p className="text-xs text-muted-foreground">No free beds for this night.</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border bg-background px-2 py-1.5 text-left font-medium">
                Bed
              </th>
              {snapshot.days.map((nightDate) => {
                const isTodayColumn = nightDate === lifecycleToday;
                return (
                  <th
                    key={nightDate}
                    className={cn(
                      'min-w-16 border px-1.5 py-1.5 text-left font-medium',
                      isTodayColumn && 'bg-primary/5 font-semibold text-foreground'
                    )}
                  >
                    {formatDayHeader(nightDate, isTodayColumn)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRoomGroups.map((group) => {
              const roomStatus = roomStatuses?.[group.roomId];
              const showRoomChip =
                housekeepingEnabled && onSetRoomStatus && !isSyntheticRoomId(group.roomId);

              return (
                <Fragment key={group.roomId}>
                  <tr className="border-t-2 border-border">
                    <td className="sticky left-0 z-10 border bg-muted px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                          {group.roomLabel}
                        </span>
                        {showRoomChip ? (
                          <HousekeepingChip
                            label={roomStatus ? ROOM_STATUS_LABELS[roomStatus] : 'Set…'}
                            needsWork={roomStatus ? roomStatusNeedsWork(roomStatus) : false}
                            unset={!roomStatus}
                            disabled={housekeepingBusy}
                            onClick={() => onSetRoomStatus(group.roomId, nextRoomStatus(roomStatus))}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td
                      colSpan={snapshot.days.length}
                      className="border bg-muted px-2 py-1.5"
                    />
                  </tr>
                  {group.rows.map((row) => {
                    const bedStatus = bedStatuses?.[row.bedId];
                    const showBedChip = housekeepingEnabled && onSetBedStatus;

                    return (
                      <tr key={row.bedId}>
                        <td className="sticky left-0 z-10 border bg-background px-2 py-1.5 pl-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-foreground">{row.displayLabel}</span>
                            {showBedChip ? (
                              <HousekeepingChip
                                label={bedStatus ? BED_STATUS_LABELS[bedStatus] : 'Set…'}
                                needsWork={bedStatus ? bedStatusNeedsWork(bedStatus) : false}
                                unset={!bedStatus}
                                disabled={housekeepingBusy}
                                onClick={() => onSetBedStatus(row.bedId, nextBedStatus(bedStatus))}
                              />
                            ) : null}
                          </div>
                        </td>
                        {row.cells.map((cell) => {
                          const lifecycle =
                            planStayStatusEnabled && cell.stay
                              ? resolvePlanStayLifecycleStatus({
                                  stay: cell.stay,
                                  today: lifecycleToday,
                                  nightDate: cell.nightDate,
                                })
                              : null;
                          const isTodayColumn = cell.nightDate === lifecycleToday;

                          return (
                            <td
                              key={`${row.bedId}-${cell.nightDate}`}
                              className={cn(
                                'border p-0.5 align-top',
                                isTodayColumn && 'bg-primary/5'
                              )}
                            >
                              {cell.status === 'free' ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectFreeNight(row.bedId, cell.nightDate)}
                                  className="flex min-h-10 w-full items-center justify-center rounded bg-muted/10 px-1 text-[10px] text-muted-foreground hover:bg-muted/30"
                                >
                                  ·
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!cell.stay}
                                  onClick={() => cell.stay && onViewStay(cell.stay.id)}
                                  className={cn(
                                    'flex min-h-10 w-full flex-col items-start justify-center gap-0.5 rounded px-1 py-0.5 text-left text-[10px]',
                                    cell.status === 'scheduled' ? 'bg-amber-50' : 'bg-primary/10',
                                    cell.stay && 'hover:bg-muted/40'
                                  )}
                                >
                                  <span className="truncate font-medium">
                                    {cell.stay?.guest_name ||
                                      (cell.status === 'scheduled' ? 'Soon' : 'Guest')}
                                  </span>
                                  {lifecycle ? (
                                    <span
                                      className={cn(
                                        'rounded border px-1 py-px text-[9px] font-medium leading-tight',
                                        lifecycleChipClass(lifecycle)
                                      )}
                                    >
                                      {planStayLifecycleStatusLabel(lifecycle)}
                                    </span>
                                  ) : null}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
