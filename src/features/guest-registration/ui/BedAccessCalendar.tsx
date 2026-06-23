'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  formatCalendarRangeLabel,
  resolveBedDayCalendar,
  shiftCalendarAnchor,
  type BedDayCalendarView,
} from '../lib/resolveBedDayCalendar';
import { todayUtcDate } from '../lib/guestAccessDates';
import { Button, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

interface BedAccessCalendarProps {
  settings: TenantSettings;
  stays: GuestStayRecordWithLink[];
  onViewStay: (stayId: string) => void;
  onSelectFreeNight: (bedId: string, nightDate: string) => void;
  embedded?: boolean;
}

const VIEW_ITEMS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
] as const;

function formatDayHeader(nightDate: string): string {
  const date = new Date(`${nightDate}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
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

export function BedAccessCalendar({
  settings,
  stays,
  onViewStay,
  onSelectFreeNight,
  embedded = false,
}: BedAccessCalendarProps) {
  const isMobile = useIsMobileCalendar();
  const [view, setView] = useState<BedDayCalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(todayUtcDate());

  const effectiveView = isMobile && view === 'month' ? 'week' : view;

  const snapshot = useMemo(
    () => resolveBedDayCalendar(settings, stays, effectiveView, anchorDate),
    [anchorDate, effectiveView, settings, stays]
  );

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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, effectiveView, -1))}
        >
          Prev
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAnchorDate(todayUtcDate())}>
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

      {!embedded ? (
        <p className="text-xs text-muted-foreground">
          Click a guest cell to open their access card. Click a free cell to prefill the issue form.
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border bg-background px-2 py-1.5 text-left font-medium">
                Bed
              </th>
              {snapshot.days.map((nightDate) => (
                <th key={nightDate} className="min-w-16 border px-1.5 py-1.5 text-left font-medium">
                  {formatDayHeader(nightDate)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshot.roomGroups.map((group) => (
              <Fragment key={group.roomId}>
                <tr>
                  <td
                    colSpan={snapshot.days.length + 1}
                    className="border bg-muted/20 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {group.roomLabel}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.bedId}>
                    <td className="sticky left-0 z-10 border bg-background px-2 py-1.5 font-medium">
                      {row.displayLabel}
                    </td>
                    {row.cells.map((cell) => (
                      <td key={`${row.bedId}-${cell.nightDate}`} className="border p-0.5 align-top">
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
                              'flex min-h-10 w-full flex-col items-start justify-center rounded px-1 py-0.5 text-left text-[10px]',
                              cell.status === 'scheduled' ? 'bg-amber-50' : 'bg-primary/10',
                              cell.stay && 'hover:bg-muted/40'
                            )}
                          >
                            <span className="truncate font-medium">
                              {cell.stay?.guest_name || (cell.status === 'scheduled' ? 'Soon' : 'Guest')}
                            </span>
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
