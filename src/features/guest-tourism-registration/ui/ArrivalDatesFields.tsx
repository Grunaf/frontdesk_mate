'use client';

import { isValidEntryStampDate } from '@/entities/guest-tourism-registration';
import { cn } from '@/shared/lib/utils';
import { Input, Label } from '@/shared/ui';
import type { SaveGuestEntryStampDatesPayload } from '../actions/saveGuestEntryStampDateAction';

export type ArrivalDatesMode = 'same' | 'different';

export type ArrivalDatesGuestDraft = {
  id: string;
  label: string;
  entryStampDate: string | null;
};

export type ArrivalDatesCopy = {
  modeLegend: string;
  modeSame: string;
  modeDifferent: string;
  dateLabel: string;
  hint: string;
  hintDifferent: string;
  savedBadge: string;
};

type ArrivalDatesFieldsProps = {
  guests: ArrivalDatesGuestDraft[];
  copy: ArrivalDatesCopy;
  disabled?: boolean;
  locked?: boolean;
  className?: string;
  mode: ArrivalDatesMode;
  onModeChange: (mode: ArrivalDatesMode) => void;
  sameDayDate: string;
  onSameDayDateChange: (value: string) => void;
  perGuestDates: Record<string, string>;
  onPerGuestDateChange: (guestId: string, value: string) => void;
  dateError?: string | null;
};

export function resolveInitialArrivalMode(guests: ArrivalDatesGuestDraft[]): ArrivalDatesMode {
  const dates = guests
    .map((guest) => guest.entryStampDate?.trim() || null)
    .filter((value): value is string => Boolean(value));
  if (dates.length >= 2 && dates.some((value) => value !== dates[0])) {
    return 'different';
  }
  return 'same';
}

export function resolveInitialSameDayDate(guests: ArrivalDatesGuestDraft[]): string {
  const first = guests.find((guest) => guest.entryStampDate?.trim())?.entryStampDate?.trim();
  return first ?? '';
}

export function resolveInitialPerGuestDates(
  guests: ArrivalDatesGuestDraft[]
): Record<string, string> {
  return Object.fromEntries(
    guests.map((guest) => [guest.id, guest.entryStampDate?.trim() ?? ''])
  );
}

export function buildArrivalDatesPayload(input: {
  mode: ArrivalDatesMode;
  guests: ArrivalDatesGuestDraft[];
  sameDayDate: string;
  perGuestDates: Record<string, string>;
}): { ok: true; payload: SaveGuestEntryStampDatesPayload } | { ok: false } {
  if (input.guests.length === 0) {
    return { ok: false };
  }

  if (input.mode === 'same') {
    const date = input.sameDayDate.trim();
    if (!isValidEntryStampDate(date)) {
      return { ok: false };
    }
    return { ok: true, payload: { mode: 'same', entryStampDate: date } };
  }

  const dates = input.guests.map((guest) => {
    const entryStampDate = (input.perGuestDates[guest.id] ?? '').trim();
    return { guestId: guest.id, entryStampDate };
  });

  if (dates.some((item) => !isValidEntryStampDate(item.entryStampDate))) {
    return { ok: false };
  }

  return { ok: true, payload: { mode: 'different', dates } };
}

export function ArrivalDatesFields({
  guests,
  copy,
  disabled = false,
  locked = false,
  className,
  mode,
  onModeChange,
  sameDayDate,
  onSameDayDateChange,
  perGuestDates,
  onPerGuestDateChange,
  dateError,
}: ArrivalDatesFieldsProps) {
  const fieldsDisabled = disabled || locked;
  const showModeToggle = guests.length > 1;

  return (
    <div className={cn('space-y-4', className)}>
      {showModeToggle ? (
        <fieldset className="space-y-2" disabled={fieldsDisabled}>
          <legend className="text-sm font-medium text-foreground">{copy.modeLegend}</legend>
          <div className="flex flex-wrap gap-4">
            {(
              [
                { value: 'same' as const, label: copy.modeSame },
                { value: 'different' as const, label: copy.modeDifferent },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 text-sm text-foreground',
                  fieldsDisabled && 'pointer-events-none opacity-60'
                )}
              >
                <input
                  type="radio"
                  name="arrival-dates-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => onModeChange(option.value)}
                  disabled={fieldsDisabled}
                  className="size-4 accent-primary"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {mode === 'same' || guests.length <= 1 ? (
        <div className="space-y-2">
          <Label htmlFor="arrival-same-day-date">{copy.dateLabel}</Label>
          <div className="relative">
            <Input
              id="arrival-same-day-date"
              type="date"
              value={sameDayDate}
              disabled={fieldsDisabled}
              aria-invalid={Boolean(dateError)}
              onChange={(event) => onSameDayDateChange(event.target.value)}
            />
            {locked ? (
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                {copy.savedBadge}
              </span>
            ) : null}
          </div>
          {!locked ? <p className="text-xs text-muted-foreground">{copy.hint}</p> : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {guests.map((guest) => (
            <li key={guest.id} className="space-y-1.5">
              <Label htmlFor={`arrival-guest-date-${guest.id}`}>{guest.label}</Label>
              <Input
                id={`arrival-guest-date-${guest.id}`}
                type="date"
                value={perGuestDates[guest.id] ?? ''}
                disabled={fieldsDisabled}
                aria-invalid={Boolean(dateError)}
                onChange={(event) => onPerGuestDateChange(guest.id, event.target.value)}
              />
            </li>
          ))}
          {!locked ? (
            <p className="text-xs text-muted-foreground">{copy.hintDifferent}</p>
          ) : null}
        </ul>
      )}

      {dateError ? <p className="text-xs text-destructive">{dateError}</p> : null}
    </div>
  );
}
