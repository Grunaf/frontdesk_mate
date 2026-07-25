'use client';

import type { VolunteerShiftRecord } from '../model/types';
import {
  formatHoursLabel,
  shiftPropertyClockHhMm,
  sumShiftHours,
} from '../lib/volunteerShiftHours';
import { cn } from '@/shared/lib/utils';

/** Minimal row for the week grid (owner list item or reception self). */
export type VolunteerWeekCalendarRow = {
  id: string;
  display_name: string;
  weekly_hours_target: number;
};

export type WeekCalendarCellSelection = {
  volunteerId: string;
  workDate: string;
  shift: VolunteerShiftRecord | null;
};

type VolunteerWeekCalendarProps = {
  weekDays: string[];
  dayLabels: string[];
  volunteers: VolunteerWeekCalendarRow[];
  shiftsByVolunteerDay: Map<string, Map<string, VolunteerShiftRecord>>;
  propertyTimeZone: string;
  canEdit: boolean;
  loadLabel: string;
  hoursUnit: string;
  emptyCellLabel: string;
  onCellSelect: (selection: WeekCalendarCellSelection) => void;
  /** Hide sticky name/load column (e.g. single-volunteer reception). */
  hideVolunteerColumn?: boolean;
};

function loadTone(planned: number, target: number): 'ok' | 'under' | 'over' {
  if (planned <= 0) return 'under';
  if (planned + 0.01 < target) return 'under';
  if (planned > target + 0.01) return 'over';
  return 'ok';
}

function cellKey(volunteerId: string, workDate: string) {
  return `${volunteerId}:${workDate}`;
}

export function VolunteerWeekCalendar({
  weekDays,
  dayLabels,
  volunteers,
  shiftsByVolunteerDay,
  propertyTimeZone,
  canEdit,
  loadLabel,
  hoursUnit,
  emptyCellLabel,
  onCellSelect,
  hideVolunteerColumn = false,
}: VolunteerWeekCalendarProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table
        className={cn(
          'w-full border-collapse text-sm',
          hideVolunteerColumn ? 'min-w-[28rem]' : 'min-w-[44rem]'
        )}
      >
        <thead>
          <tr className="border-b bg-muted/40">
            {hideVolunteerColumn ? null : (
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[10rem] bg-muted/40 px-3 py-2 text-left font-medium"
              >
                {/* volunteer column */}
              </th>
            )}
            {weekDays.map((day, index) => (
              <th
                key={day}
                scope="col"
                className="min-w-[5.5rem] px-2 py-2 text-center font-medium"
              >
                <div>{dayLabels[index]}</div>
                <div className="text-xs font-normal text-muted-foreground">
                  {day.slice(8)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {volunteers.map((volunteer) => {
            const dayMap = shiftsByVolunteerDay.get(volunteer.id);
            const weekShifts = weekDays
              .map((day) => dayMap?.get(day))
              .filter((shift): shift is VolunteerShiftRecord => shift != null);
            const planned = sumShiftHours(weekShifts);
            const target = volunteer.weekly_hours_target || 25;
            const tone = loadTone(planned, target);

            return (
              <tr key={volunteer.id} className="border-b last:border-b-0">
                {hideVolunteerColumn ? null : (
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-background px-3 py-2 text-left align-top font-medium"
                  >
                    <div>{volunteer.display_name}</div>
                    <div
                      className={cn(
                        'text-xs font-normal',
                        tone === 'ok' && 'text-emerald-700',
                        tone === 'under' && 'text-amber-700',
                        tone === 'over' && 'text-destructive'
                      )}
                    >
                      {loadLabel}: {formatHoursLabel(planned)} /{' '}
                      {formatHoursLabel(target)} {hoursUnit}
                    </div>
                  </th>
                )}
                {weekDays.map((workDate) => {
                  const shift = dayMap?.get(workDate) ?? null;
                  const start =
                    shift != null
                      ? shiftPropertyClockHhMm(shift.starts_at, propertyTimeZone)
                      : null;
                  const end =
                    shift != null
                      ? shiftPropertyClockHhMm(shift.ends_at, propertyTimeZone)
                      : null;
                  const label =
                    start && end ? `${start}–${end}` : emptyCellLabel;

                  return (
                    <td key={cellKey(volunteer.id, workDate)} className="p-1 align-top">
                      <button
                        type="button"
                        disabled={!canEdit}
                        className={cn(
                          'flex h-full min-h-12 w-full items-center justify-center rounded-md px-1 py-2 text-center text-xs transition-colors',
                          shift
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground',
                          canEdit &&
                            (shift
                              ? 'cursor-pointer hover:bg-primary/15'
                              : 'cursor-pointer hover:bg-muted/60'),
                          !canEdit && 'cursor-default'
                        )}
                        onClick={() =>
                          onCellSelect({
                            volunteerId: volunteer.id,
                            workDate,
                            shift,
                          })
                        }
                      >
                        {label}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
