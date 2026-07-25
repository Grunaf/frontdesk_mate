'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import type { VolunteerListItem } from '@/entities/volunteer';
import {
  expandRepeatWorkDates,
  ISO_WEEKDAYS_ALL,
  ISO_WEEKDAYS_MON_FRI,
  type IsoWeekday,
} from '@/entities/volunteer';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

import { createVolunteerShiftsBulkAction } from '../api/scheduleActions';

export type RepeatDaySheetLabels = {
  title: string;
  description: string;
  volunteer: string;
  start: string;
  end: string;
  from: string;
  until: string;
  weekdays: string;
  presetMonFri: string;
  presetAllWeek: string;
  presetCustom: string;
  weekdayLabels: Record<IsoWeekday, string>;
  apply: string;
  overwrite: string;
  overwriteConfirm: string;
  errors: Record<string, string>;
};

type RepeatDaySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  volunteers: VolunteerListItem[];
  defaultVolunteerId: string;
  defaultFrom: string;
  defaultUntil: string;
  labels: RepeatDaySheetLabels;
  onApplied: (message: string | null) => void;
};

type WeekdayPreset = 'monFri' | 'all' | 'custom';

function toggleWeekday(current: IsoWeekday[], day: IsoWeekday): IsoWeekday[] {
  if (current.includes(day)) {
    return current.filter((item) => item !== day);
  }
  return [...current, day].sort((a, b) => a - b);
}

export function RepeatDaySheet({
  open,
  onOpenChange,
  locale,
  volunteers,
  defaultVolunteerId,
  defaultFrom,
  defaultUntil,
  labels,
  onApplied,
}: RepeatDaySheetProps) {
  const tRepeat = useTranslations('pages.owner.schedule.repeat');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [volunteerId, setVolunteerId] = useState(defaultVolunteerId);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('14:00');
  const [from, setFrom] = useState(defaultFrom);
  const [until, setUntil] = useState(defaultUntil);
  const [preset, setPreset] = useState<WeekdayPreset>('monFri');
  const [weekdays, setWeekdays] = useState<IsoWeekday[]>([...ISO_WEEKDAYS_MON_FRI]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setVolunteerId(defaultVolunteerId);
    setStartTime('09:00');
    setEndTime('14:00');
    setFrom(defaultFrom);
    setUntil(defaultUntil);
    setPreset('monFri');
    setWeekdays([...ISO_WEEKDAYS_MON_FRI]);
  }, [open, defaultVolunteerId, defaultFrom, defaultUntil]);

  const activeWeekdays = useMemo(() => {
    if (preset === 'monFri') return ISO_WEEKDAYS_MON_FRI;
    if (preset === 'all') return ISO_WEEKDAYS_ALL;
    return weekdays;
  }, [preset, weekdays]);

  const previewDates = useMemo(
    () =>
      expandRepeatWorkDates({
        from,
        until,
        weekdays: activeWeekdays,
      }),
    [from, until, activeWeekdays]
  );

  const mapError = (code: string) => labels.errors[code] ?? labels.errors.unknown;

  const apply = (conflictPolicy: 'skip' | 'overwrite') => {
    if (!volunteerId || previewDates.length === 0) return;
    startTransition(async () => {
      setError(null);
      const result = await createVolunteerShiftsBulkAction({
        locale,
        volunteerId,
        workDates: previewDates,
        startTime,
        endTime,
        conflictPolicy,
      });
      if (!result.ok) {
        setError(mapError(result.error));
        return;
      }

      const parts: string[] = [];
      if (result.createdCount > 0) {
        parts.push(tRepeat('createdMessage', { count: result.createdCount }));
      }
      if (result.skippedCount > 0) {
        parts.push(tRepeat('skippedMessage', { count: result.skippedCount }));
      }
      onApplied(parts.length > 0 ? parts.join(' ') : null);
      onOpenChange(false);
    });
  };

  const handleApply = () => {
    apply('skip');
  };

  const handleOverwrite = () => {
    if (!window.confirm(labels.overwriteConfirm)) return;
    apply('overwrite');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 pb-4">
          <div className="space-y-1">
            <Label>{labels.volunteer}</Label>
            <Select value={volunteerId} onValueChange={setVolunteerId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {volunteers.map((volunteer) => (
                  <SelectItem key={volunteer.id} value={volunteer.id}>
                    {volunteer.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="repeat-start">{labels.start}</Label>
              <Input
                id="repeat-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="repeat-end">{labels.end}</Label>
              <Input
                id="repeat-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="repeat-from">{labels.from}</Label>
              <Input
                id="repeat-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="repeat-until">{labels.until}</Label>
              <Input
                id="repeat-until"
                type="date"
                value={until}
                onChange={(event) => setUntil(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{labels.weekdays}</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['monFri', labels.presetMonFri],
                  ['all', labels.presetAllWeek],
                  ['custom', labels.presetCustom],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={preset === id ? 'default' : 'outline'}
                  onClick={() => {
                    setPreset(id);
                    if (id === 'monFri') setWeekdays([...ISO_WEEKDAYS_MON_FRI]);
                    if (id === 'all') setWeekdays([...ISO_WEEKDAYS_ALL]);
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ISO_WEEKDAYS_ALL.map((day) => {
                const selected = activeWeekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={preset !== 'custom'}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground',
                      preset !== 'custom' && 'opacity-70'
                    )}
                    onClick={() => {
                      if (preset !== 'custom') return;
                      setWeekdays((current) => toggleWeekday(current, day));
                    }}
                  >
                    {labels.weekdayLabels[day]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {tRepeat('skipHint', { count: previewDates.length })}
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <SheetFooter>
          <Button
            type="button"
            disabled={isPending || !volunteerId || previewDates.length === 0}
            onClick={handleApply}
          >
            {labels.apply}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !volunteerId || previewDates.length === 0}
            onClick={handleOverwrite}
          >
            {labels.overwrite}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
