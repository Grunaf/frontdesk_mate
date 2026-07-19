'use client';

import { useEffect, useState, useTransition } from 'react';
import type { GuestTourismGuest } from '@/entities/guest-tourism-registration';
import {
  ArrivalDatesFields,
  buildArrivalDatesPayload,
  resolveInitialArrivalMode,
  resolveInitialPerGuestDates,
  resolveInitialSameDayDate,
  setTourismGuestEntryStampDateAction,
  type ArrivalDatesGuestDraft,
  type ArrivalDatesMode,
} from '@/features/guest-tourism-registration';
import { Button } from '@/shared/ui';

type ReceptionArrivalDatesBlockProps = {
  tenantSlug: string;
  stayId: string;
  guests: GuestTourismGuest[];
  disabled?: boolean;
  onGuestsPatched: (patchByGuestId: Record<string, string | null>) => void;
  onError: (message: string | null) => void;
};

function toDraftGuests(guests: GuestTourismGuest[]): ArrivalDatesGuestDraft[] {
  return guests.map((guest) => ({
    id: guest.id,
    label: `${guest.first_name} ${guest.last_name}`.trim(),
    entryStampDate: guest.entry_stamp_date,
  }));
}

export function ReceptionArrivalDatesBlock({
  tenantSlug,
  stayId,
  guests,
  disabled = false,
  onGuestsPatched,
  onError,
}: ReceptionArrivalDatesBlockProps) {
  const draftGuests = toDraftGuests(guests);
  const [mode, setMode] = useState<ArrivalDatesMode>(() =>
    resolveInitialArrivalMode(draftGuests)
  );
  const [sameDayDate, setSameDayDate] = useState(() => resolveInitialSameDayDate(draftGuests));
  const [perGuestDates, setPerGuestDates] = useState(() =>
    resolveInitialPerGuestDates(draftGuests)
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  useEffect(() => {
    const next = toDraftGuests(guests);
    setMode(resolveInitialArrivalMode(next));
    setSameDayDate(resolveInitialSameDayDate(next));
    setPerGuestDates(resolveInitialPerGuestDates(next));
  }, [guests]);

  if (guests.length === 0) {
    return null;
  }

  const handleSave = () => {
    setDateError(null);
    onError(null);

    const built = buildArrivalDatesPayload({
      mode: guests.length <= 1 ? 'same' : mode,
      guests: draftGuests,
      sameDayDate,
      perGuestDates,
    });
    if (!built.ok) {
      setDateError('Enter a valid entry date.');
      return;
    }

    startSave(async () => {
      const payload = built.payload;
      const assignments =
        payload.mode === 'same'
          ? guests.map((guest) => ({
              guestId: guest.id,
              entryStampDate: payload.entryStampDate,
            }))
          : payload.dates;

      const patch: Record<string, string | null> = {};
      for (const assignment of assignments) {
        const result = await setTourismGuestEntryStampDateAction({
          tenantSlug,
          stayId,
          guestId: assignment.guestId,
          entryStampDate: assignment.entryStampDate,
        });
        if (!result.ok) {
          onError(
            result.error === 'invalid_date'
              ? 'Enter a valid entry date.'
              : result.error === 'unauthorized'
                ? 'Sign in again at reception desk.'
                : 'Could not save entry date.'
          );
          return;
        }
        patch[assignment.guestId] = assignment.entryStampDate;
      }
      onGuestsPatched(patch);
    });
  };

  const dirty =
    mode === 'same' || guests.length <= 1
      ? guests.some((guest) => (guest.entry_stamp_date ?? '') !== sameDayDate.trim())
      : guests.some(
          (guest) => (guest.entry_stamp_date ?? '') !== (perGuestDates[guest.id] ?? '').trim()
        );

  return (
    <div className="space-y-3 rounded-md border border-border/70 bg-background/80 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Arrival / entry dates
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-[11px]"
          disabled={disabled || isSaving || !dirty}
          onClick={handleSave}
        >
          {isSaving ? 'Saving…' : 'Save dates'}
        </Button>
      </div>
      <ArrivalDatesFields
        guests={draftGuests}
        copy={{
          modeLegend: 'Did everyone arrive on the same day?',
          modeSame: 'Same day for everyone',
          modeDifferent: 'Different dates',
          dateLabel: 'Date of entry',
          hint: 'One date is applied to everyone on this booking.',
          hintDifferent: 'Enter the entry date for each guest.',
          savedBadge: 'Saved',
        }}
        disabled={disabled || isSaving}
        mode={mode}
        onModeChange={setMode}
        sameDayDate={sameDayDate}
        onSameDayDateChange={(value) => {
          setSameDayDate(value);
          setDateError(null);
        }}
        perGuestDates={perGuestDates}
        onPerGuestDateChange={(guestId, value) => {
          setPerGuestDates((current) => ({ ...current, [guestId]: value }));
          setDateError(null);
        }}
        dateError={dateError}
      />
    </div>
  );
}
