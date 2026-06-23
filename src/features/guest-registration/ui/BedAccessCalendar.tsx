'use client';

import { Fragment, useMemo, useState } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  formatCalendarRangeLabel,
  resolveBedDayCalendar,
  shiftCalendarAnchor,
  type BedDayCalendarView,
} from '../lib/resolveBedDayCalendar';
import { todayUtcDate } from '../lib/guestAccessDates';
import { Badge, Button, SegmentedChipBar } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

interface BedAccessCalendarProps {
  settings: TenantSettings;
  stays: GuestStayRecordWithLink[];
  onViewStay: (stayId: string) => void;
  onSelectFreeNight: (bedId: string, nightDate: string) => void;
}

const VIEW_ITEMS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
] as const;

function formatDayHeader(nightDate: string): string {
  const date = new Date(`${nightDate}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

export function BedAccessCalendar({
  settings,
  stays,
  onViewStay,
  onSelectFreeNight,
}: BedAccessCalendarProps) {
  const [view, setView] = useState<BedDayCalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(todayUtcDate());

  const snapshot = useMemo(
    () => resolveBedDayCalendar(settings, stays, view, anchorDate),
    [anchorDate, settings, stays, view]
  );

  if (snapshot.roomGroups.length === 0) {
    return null;
  }

  const rangeLabel = formatCalendarRangeLabel(snapshot.rangeStart, snapshot.rangeEnd);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Access calendar</h3>
          <p className="text-xs text-muted-foreground">
            Bed-by-night plan for issued access. Click a guest cell to jump to their access card.
          </p>
        </div>

        <SegmentedChipBar
          ariaLabel="Calendar view"
          items={[...VIEW_ITEMS]}
          value={view}
          onValueChange={(id) => {
            setView(id as BedDayCalendarView);
            setAnchorDate(todayUtcDate());
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, view, -1))}
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
            onClick={() => setAnchorDate((current) => shiftCalendarAnchor(current, view, 1))}
          >
            Next
          </Button>
          <span className="text-xs text-muted-foreground">{rangeLabel}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border bg-background px-2 py-2 text-left font-medium">
                Bed
              </th>
              {snapshot.days.map((nightDate) => (
                <th key={nightDate} className="min-w-20 border px-2 py-2 text-left font-medium">
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
                    <td className="sticky left-0 z-10 border bg-background px-2 py-2 font-medium">
                      {row.displayLabel}
                    </td>
                    {row.cells.map((cell) => {
                      const isInteractive = cell.status !== 'free';
                      const label =
                        cell.status === 'free'
                          ? 'Free'
                          : cell.status === 'scheduled'
                            ? 'Scheduled'
                            : 'In use';

                      return (
                        <td key={`${row.bedId}-${cell.nightDate}`} className="border p-1 align-top">
                          {cell.status === 'free' ? (
                            <button
                              type="button"
                              onClick={() => onSelectFreeNight(row.bedId, cell.nightDate)}
                              className="flex min-h-14 w-full flex-col items-start gap-1 rounded-md bg-muted/10 px-2 py-1 text-left hover:bg-muted/30"
                            >
                              <Badge variant="outline">{label}</Badge>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!isInteractive || !cell.stay}
                              onClick={() => cell.stay && onViewStay(cell.stay.id)}
                              className={cn(
                                'flex min-h-14 w-full flex-col items-start gap-1 rounded-md px-2 py-1 text-left',
                                cell.status === 'scheduled' ? 'bg-amber-50' : 'bg-secondary/40',
                                cell.stay && 'hover:bg-muted/40'
                              )}
                            >
                              <Badge variant={cell.status === 'scheduled' ? 'outline' : 'secondary'}>
                                {label}
                              </Badge>
                              {cell.stay?.guest_name ? (
                                <span className="truncate text-[11px] text-muted-foreground">
                                  {cell.stay.guest_name}
                                </span>
                              ) : null}
                            </button>
                          )}
                        </td>
                      );
                    })}
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
