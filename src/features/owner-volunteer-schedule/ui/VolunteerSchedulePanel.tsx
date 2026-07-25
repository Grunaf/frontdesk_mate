'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { VolunteerListItem, VolunteerShiftRecord } from '@/entities/volunteer';
import {
  formatHoursLabel,
  listIsoWeekCalendarDays,
  shiftPropertyCalendarDay,
  startOfIsoWeekCalendarDay,
  sumShiftHours,
  VolunteerWeekCalendar,
  type WeekCalendarCellSelection,
} from '@/entities/volunteer';
import { addStayCalendarDays } from '@/entities/guest-stay';
import { Button, Input, Label } from '@/shared/ui';

import { updateVolunteerWeeklyHoursTargetAction } from '../api/scheduleActions';
import { RepeatDaySheet, type RepeatDaySheetLabels } from './RepeatDaySheet';
import { ShiftDaySheet, type ShiftDaySheetLabels } from './ShiftDaySheet';

export type VolunteerSchedulePanelLabels = {
  title: string;
  subtitle: string;
  emptyVolunteers: string;
  weekLabel: string;
  prevWeek: string;
  nextWeek: string;
  thisWeek: string;
  loadLabel: string;
  targetLabel: string;
  saveTarget: string;
  emptyCell: string;
  repeatDay: string;
  periodHours: string;
  hoursUnit: string;
  day: ShiftDaySheetLabels;
  repeat: RepeatDaySheetLabels;
  errors: Record<string, string>;
};

type VolunteerSchedulePanelProps = {
  locale: string;
  canEdit: boolean;
  propertyTimeZone: string;
  weekStartMonday: string;
  volunteers: VolunteerListItem[];
  shifts: VolunteerShiftRecord[];
  labels: VolunteerSchedulePanelLabels;
};

function formatWeekdayHeader(calendarDay: string, locale: string): string {
  const [year, month, day] = calendarDay.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function VolunteerSchedulePanel({
  locale,
  canEdit,
  propertyTimeZone,
  weekStartMonday,
  volunteers,
  shifts,
  labels,
}: VolunteerSchedulePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [selection, setSelection] = useState<WeekCalendarCellSelection | null>(null);

  const weekDays = useMemo(
    () => listIsoWeekCalendarDays(weekStartMonday) ?? [],
    [weekStartMonday]
  );
  const weekEnd = weekDays[6] ?? addStayCalendarDays(weekStartMonday, 6);
  const dayLabels = useMemo(
    () => weekDays.map((day) => formatWeekdayHeader(day, locale)),
    [weekDays, locale]
  );

  const shiftsByVolunteerDay = useMemo(() => {
    const map = new Map<string, Map<string, VolunteerShiftRecord>>();
    for (const shift of shifts) {
      const day = shiftPropertyCalendarDay(shift.starts_at, propertyTimeZone);
      if (!day) continue;
      const byDay = map.get(shift.volunteer_id) ?? new Map();
      // One shift per day in the grid; keep earliest if duplicates exist.
      const existing = byDay.get(day);
      if (!existing || existing.starts_at > shift.starts_at) {
        byDay.set(day, shift);
      }
      map.set(shift.volunteer_id, byDay);
    }
    return map;
  }, [shifts, propertyTimeZone]);

  const periodHours = useMemo(() => sumShiftHours(shifts), [shifts]);

  const [targets, setTargets] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      volunteers.map((volunteer) => [
        volunteer.id,
        String(volunteer.weekly_hours_target ?? 25),
      ])
    )
  );

  const goWeek = (delta: number) => {
    const next = addStayCalendarDays(weekStartMonday, delta * 7);
    router.push(`/${locale}/schedule?week=${next}`);
  };

  const mapError = (code: string) => labels.errors[code] ?? labels.errors.unknown;

  const selectedVolunteer =
    volunteers.find((volunteer) => volunteer.id === selection?.volunteerId) ?? null;

  const handleCellSelect = (next: WeekCalendarCellSelection) => {
    if (!canEdit) return;
    setSelection(next);
    setDaySheetOpen(true);
  };

  const handleSaveTarget = (id: string) => {
    if (!canEdit) return;
    const raw = Number(targets[id]);
    startTransition(async () => {
      setError(null);
      setInfo(null);
      const result = await updateVolunteerWeeklyHoursTargetAction({
        locale,
        volunteerId: id,
        weeklyHoursTarget: raw,
      });
      if (!result.ok) {
        setError(mapError(result.error));
        return;
      }
      router.refresh();
    });
  };

  const refresh = () => {
    setInfo(null);
    setError(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => goWeek(-1)}>
          {labels.prevWeek}
        </Button>
        <p className="text-sm font-medium">
          {labels.weekLabel}: {weekStartMonday} → {weekEnd}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => goWeek(1)}>
          {labels.nextWeek}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const monday = startOfIsoWeekCalendarDay(
              new Date().toISOString().slice(0, 10)
            );
            if (monday) router.push(`/${locale}/schedule?week=${monday}`);
          }}
        >
          {labels.thisWeek}
        </Button>
        <p className="text-sm text-muted-foreground">
          {labels.periodHours}: {formatHoursLabel(periodHours)} {labels.hoursUnit}
        </p>
        {canEdit && volunteers.length > 0 ? (
          <Button type="button" size="sm" onClick={() => setRepeatOpen(true)}>
            {labels.repeatDay}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}

      {volunteers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.emptyVolunteers}</p>
      ) : (
        <>
          <VolunteerWeekCalendar
            weekDays={weekDays}
            dayLabels={dayLabels}
            volunteers={volunteers}
            shiftsByVolunteerDay={shiftsByVolunteerDay}
            propertyTimeZone={propertyTimeZone}
            canEdit={canEdit}
            loadLabel={labels.loadLabel}
            hoursUnit={labels.hoursUnit}
            emptyCellLabel={labels.emptyCell}
            onCellSelect={handleCellSelect}
          />

          {canEdit ? (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">{labels.targetLabel}</p>
              <ul className="space-y-3">
                {volunteers.map((volunteer) => {
                  const target = volunteer.weekly_hours_target || 25;
                  return (
                    <li
                      key={volunteer.id}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <div className="min-w-[8rem] flex-1 space-y-1">
                        <Label htmlFor={`target-${volunteer.id}`}>
                          {volunteer.display_name}
                        </Label>
                        <Input
                          id={`target-${volunteer.id}`}
                          className="h-9 w-28"
                          inputMode="decimal"
                          value={targets[volunteer.id] ?? String(target)}
                          onChange={(event) =>
                            setTargets((current) => ({
                              ...current,
                              [volunteer.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleSaveTarget(volunteer.id)}
                      >
                        {labels.saveTarget}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {canEdit && volunteers.length > 0 ? (
        <>
          <RepeatDaySheet
            open={repeatOpen}
            onOpenChange={setRepeatOpen}
            locale={locale}
            volunteers={volunteers}
            defaultVolunteerId={volunteers[0]?.id ?? ''}
            defaultFrom={weekStartMonday}
            defaultUntil={weekEnd}
            labels={{
              ...labels.repeat,
              errors: labels.errors,
            }}
            onApplied={(message) => {
              setInfo(message);
              setError(null);
              router.refresh();
            }}
          />
          <ShiftDaySheet
            open={daySheetOpen}
            onOpenChange={setDaySheetOpen}
            locale={locale}
            propertyTimeZone={propertyTimeZone}
            volunteer={selectedVolunteer}
            workDate={selection?.workDate ?? null}
            shift={selection?.shift ?? null}
            labels={{
              ...labels.day,
              errors: labels.errors,
            }}
            onSaved={refresh}
          />
        </>
      ) : null}
    </div>
  );
}
