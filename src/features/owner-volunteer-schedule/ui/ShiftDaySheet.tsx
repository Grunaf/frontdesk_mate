'use client';

import { useEffect, useState, useTransition } from 'react';

import type { VolunteerListItem, VolunteerShiftRecord } from '@/entities/volunteer';
import {
  shiftPropertyCalendarDay,
  shiftPropertyClockHhMm,
} from '@/entities/volunteer';
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui';

import {
  createVolunteerShiftAction,
  deleteVolunteerShiftAction,
  updateVolunteerShiftAction,
} from '../api/scheduleActions';

export type ShiftDaySheetLabels = {
  titleEdit: string;
  titleCreate: string;
  description: string;
  volunteer: string;
  date: string;
  start: string;
  end: string;
  save: string;
  create: string;
  remove: string;
  removeConfirm: string;
  errors: Record<string, string>;
};

type ShiftDaySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  propertyTimeZone: string;
  volunteer: VolunteerListItem | null;
  workDate: string | null;
  shift: VolunteerShiftRecord | null;
  labels: ShiftDaySheetLabels;
  onSaved: () => void;
};

export function ShiftDaySheet({
  open,
  onOpenChange,
  locale,
  propertyTimeZone,
  volunteer,
  workDate,
  shift,
  labels,
  onSaved,
}: ShiftDaySheetProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('14:00');

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (shift) {
      setStartTime(
        shiftPropertyClockHhMm(shift.starts_at, propertyTimeZone) ?? '09:00'
      );
      setEndTime(shiftPropertyClockHhMm(shift.ends_at, propertyTimeZone) ?? '14:00');
      return;
    }
    setStartTime('09:00');
    setEndTime('14:00');
  }, [open, shift, propertyTimeZone]);

  const mapError = (code: string) => labels.errors[code] ?? labels.errors.unknown;
  const resolvedDate =
    workDate ??
    (shift ? shiftPropertyCalendarDay(shift.starts_at, propertyTimeZone) : null);

  const handleSave = () => {
    if (!volunteer || !resolvedDate) return;
    startTransition(async () => {
      setError(null);
      if (shift) {
        const result = await updateVolunteerShiftAction({
          locale,
          shiftId: shift.id,
          workDate: resolvedDate,
          startTime,
          endTime,
        });
        if (!result.ok) {
          setError(mapError(result.error));
          return;
        }
      } else {
        const result = await createVolunteerShiftAction({
          locale,
          volunteerId: volunteer.id,
          workDate: resolvedDate,
          startTime,
          endTime,
        });
        if (!result.ok) {
          setError(mapError(result.error));
          return;
        }
      }
      onSaved();
      onOpenChange(false);
    });
  };

  const handleDelete = () => {
    if (!shift) return;
    if (!window.confirm(labels.removeConfirm)) return;
    startTransition(async () => {
      setError(null);
      const result = await deleteVolunteerShiftAction({
        locale,
        shiftId: shift.id,
      });
      if (!result.ok) {
        setError(mapError(result.error));
        return;
      }
      onSaved();
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{shift ? labels.titleEdit : labels.titleCreate}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
          <div className="space-y-1">
            <Label>{labels.volunteer}</Label>
            <p className="text-sm">{volunteer?.display_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label>{labels.date}</Label>
            <p className="text-sm">{resolvedDate ?? '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="day-start">{labels.start}</Label>
              <Input
                id="day-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="day-end">{labels.end}</Label>
              <Input
                id="day-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <SheetFooter>
          <Button
            type="button"
            disabled={isPending || !volunteer || !resolvedDate}
            onClick={handleSave}
          >
            {shift ? labels.save : labels.create}
          </Button>
          {shift ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              {labels.remove}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
