'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  formatHoursLabel,
  listIsoWeekCalendarDays,
  shiftDurationHours,
  shiftPropertyCalendarDay,
  startOfIsoWeekCalendarDay,
  sumShiftHours,
  VolunteerWeekCalendar,
} from '@/entities/volunteer';
import type { VolunteerShiftRecord } from '@/entities/volunteer';
import { addStayCalendarDays, todayPropertyStayCalendarDay } from '@/entities/guest-stay';
import { Button } from '@/shared/ui';
import {
  loadMyReceptionScheduleCached,
  readMyReceptionScheduleCache,
} from '../lib/myReceptionScheduleCache';

function formatTimeRange(
  startsAt: string,
  endsAt: string,
  timeZone: string
): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${fmt.format(new Date(startsAt))}–${fmt.format(new Date(endsAt))}`;
  } catch {
    return `${startsAt}–${endsAt}`;
  }
}

function formatWeekdayHeader(calendarDay: string): string {
  const [year, month, day] = calendarDay.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function shiftPropertyDay(iso: string, timeZone: string): string {
  return shiftPropertyCalendarDay(iso, timeZone) ?? iso.slice(0, 10);
}

type ReceptionMySchedulePanelProps = {
  tenantSlug: string;
  isActive: boolean;
  /** Start loading before the tab is opened (e.g. when More menu opens). */
  prefetch?: boolean;
};

export function ReceptionMySchedulePanel({
  tenantSlug,
  isActive,
  prefetch = false,
}: ReceptionMySchedulePanelProps) {
  const [weekStartMonday, setWeekStartMonday] = useState<string | null>(null);
  const [isPending, startLoad] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [volunteer, setVolunteer] = useState<{
    id: string;
    displayName: string;
    weeklyHoursTarget: number;
  } | null>(null);
  const [shifts, setShifts] = useState<VolunteerShiftRecord[]>([]);
  const [propertyTimeZone, setPropertyTimeZone] = useState('UTC');
  const [todayShifts, setTodayShifts] = useState<VolunteerShiftRecord[]>([]);
  const [todayDate, setTodayDate] = useState<string | null>(null);

  const shouldLoad = isActive || prefetch;

  useEffect(() => {
    if (!shouldLoad) return;

    if (weekStartMonday) {
      const hit = readMyReceptionScheduleCache(tenantSlug, weekStartMonday);
      if (hit) {
        setVolunteer(hit.volunteer);
        setShifts(hit.shifts);
        setPropertyTimeZone(hit.propertyTimeZone);
        setError(null);
      }
    }

    startLoad(async () => {
      setError(null);
      const result = await loadMyReceptionScheduleCached(tenantSlug, {
        weekStartMonday: weekStartMonday ?? undefined,
      });
      if (!result.ok) {
        setError(
          result.error === 'unauthorized'
            ? 'Sign in again at reception desk.'
            : 'Could not load your schedule.'
        );
        setVolunteer(null);
        setShifts([]);
        return;
      }

      setVolunteer(result.volunteer);
      setShifts(result.shifts);
      setPropertyTimeZone(result.propertyTimeZone);
      setWeekStartMonday((current) => current ?? result.weekStartMonday);

      const today = todayPropertyStayCalendarDay(new Date(), result.propertyTimeZone);
      setTodayDate(today);
      const todayInWeek = today >= result.fromDate && today <= result.toDate;
      if (todayInWeek) {
        setTodayShifts(
          result.shifts.filter(
            (shift) => shiftPropertyDay(shift.starts_at, result.propertyTimeZone) === today
          )
        );
      }
    });
  }, [shouldLoad, tenantSlug, weekStartMonday]);

  const weekDays = useMemo(
    () => (weekStartMonday ? listIsoWeekCalendarDays(weekStartMonday) ?? [] : []),
    [weekStartMonday]
  );
  const weekEnd = weekDays[6] ?? null;
  const dayLabels = useMemo(
    () => weekDays.map((day) => formatWeekdayHeader(day)),
    [weekDays]
  );

  const shiftsByVolunteerDay = useMemo(() => {
    const map = new Map<string, Map<string, VolunteerShiftRecord>>();
    if (!volunteer) return map;
    const byDay = new Map<string, VolunteerShiftRecord>();
    for (const shift of shifts) {
      const day = shiftPropertyDay(shift.starts_at, propertyTimeZone);
      const existing = byDay.get(day);
      if (!existing || existing.starts_at > shift.starts_at) {
        byDay.set(day, shift);
      }
    }
    map.set(volunteer.id, byDay);
    return map;
  }, [shifts, volunteer, propertyTimeZone]);

  const weekHours = sumShiftHours(shifts);
  const target = volunteer?.weeklyHoursTarget ?? 25;
  const showInitialLoading = isPending && !weekStartMonday;

  const goWeek = (delta: number) => {
    if (!weekStartMonday) return;
    setWeekStartMonday(addStayCalendarDays(weekStartMonday, delta * 7));
  };

  const goThisWeek = () => {
    const today = todayPropertyStayCalendarDay(new Date(), propertyTimeZone);
    const monday = startOfIsoWeekCalendarDay(today);
    if (monday) setWeekStartMonday(monday);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">My schedule</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your shifts this week. Ask your manager to change the plan.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {showInitialLoading ? (
        <p className="text-sm text-muted-foreground">Loading schedule…</p>
      ) : null}

      {!showInitialLoading && !error && !volunteer && weekStartMonday ? (
        <p className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
          No volunteer profile is linked to this desk login, so there is no personal schedule yet.
        </p>
      ) : null}

      {volunteer && todayDate ? (
        <div className="space-y-2 rounded-lg border bg-card px-3 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Today
          </p>
          {todayShifts.length === 0 ? (
            <p className="text-base font-medium text-foreground">Off</p>
          ) : (
            <ul className="space-y-1">
              {todayShifts.map((shift) => (
                <li key={shift.id} className="text-base font-medium text-foreground">
                  {formatTimeRange(shift.starts_at, shift.ends_at, propertyTimeZone)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({formatHoursLabel(shiftDurationHours(shift.starts_at, shift.ends_at))} h)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {volunteer && weekStartMonday && weekEnd ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => goWeek(-1)}>
              Previous
            </Button>
            <p className="text-sm font-medium">
              Week: {weekStartMonday} → {weekEnd}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => goWeek(1)}>
              Next
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={goThisWeek}>
              This week
            </Button>
            <p className="text-sm text-muted-foreground">
              Load: {formatHoursLabel(weekHours)} / {formatHoursLabel(target)} h
            </p>
          </div>

          <VolunteerWeekCalendar
            weekDays={weekDays}
            dayLabels={dayLabels}
            volunteers={[
              {
                id: volunteer.id,
                display_name: volunteer.displayName,
                weekly_hours_target: target,
              },
            ]}
            shiftsByVolunteerDay={shiftsByVolunteerDay}
            propertyTimeZone={propertyTimeZone}
            canEdit={false}
            loadLabel="Load"
            hoursUnit="h"
            emptyCellLabel="Off"
            hideVolunteerColumn
            onCellSelect={() => {}}
          />
        </div>
      ) : null}

      {volunteer && shifts.length === 0 && !showInitialLoading && weekStartMonday ? (
        <p className="text-sm text-muted-foreground">
          No shifts planned this week — ask your manager to plan your week.
        </p>
      ) : null}
    </div>
  );
}
