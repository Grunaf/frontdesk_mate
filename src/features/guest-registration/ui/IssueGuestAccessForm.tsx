'use client';

import {
  formatAccessPeriodSummary,
  type GuestAccessFormMode,
} from '../lib/guestAccessDates';
import { GuestAccessDateRange } from './GuestAccessDateRange';
import { Button, Input, Label, SegmentedChipBar } from '@/shared/ui';

interface BedOptionGroup {
  roomId: string;
  roomLabel: string;
  beds: Array<{ bedId: string; displayLabel: string }>;
}

interface IssueGuestAccessFormProps {
  mode: GuestAccessFormMode;
  onModeChange: (mode: GuestAccessFormMode) => void;
  modeLocked: boolean;
  guestName: string;
  onGuestNameChange: (value: string) => void;
  bedId: string;
  onBedIdChange: (value: string) => void;
  bedsByRoom: BedOptionGroup[];
  checkInDate: string;
  checkOutDate: string;
  onDatesChange: (next: { checkInDate: string; checkOutDate: string }) => void;
  reissueGuestLabel?: string;
  editIntent?: 'moveBed' | 'changeDates';
  onCancelReissue?: () => void;
  bedsAvailabilityHint: string | null;
  error: string | null;
  isPending: boolean;
  rangeValid: boolean;
  canSubmit: boolean;
  isReissue: boolean;
  isEditingReservation?: boolean;
  onSubmit: () => void;
}

const MODE_ITEMS = [
  { id: 'walk-in', label: 'Tonight' },
  { id: 'custom', label: 'Pick dates' },
] as const;

export function IssueGuestAccessForm({
  mode,
  onModeChange,
  modeLocked,
  guestName,
  onGuestNameChange,
  bedId,
  onBedIdChange,
  bedsByRoom,
  checkInDate,
  checkOutDate,
  onDatesChange,
  reissueGuestLabel,
  editIntent = 'changeDates',
  onCancelReissue,
  bedsAvailabilityHint,
  error,
  isPending,
  rangeValid,
  canSubmit,
  isReissue,
  isEditingReservation = false,
  onSubmit,
}: IssueGuestAccessFormProps) {
  const submitLabel = isPending
    ? isEditingReservation
      ? 'Saving…'
      : isReissue
        ? 'Re-issuing…'
        : 'Issuing…'
    : isEditingReservation
      ? 'Save reservation'
      : isReissue
        ? 'Save new access'
        : 'Issue access';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold" title="App access only — not your booking system">
          Issue guest access
        </h2>
      </div>

      {isEditingReservation && onCancelReissue ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-sky-50 px-3 py-2 text-xs text-sky-950">
          <span>
            {editIntent === 'moveBed'
              ? `Moving ${reissueGuestLabel || 'guest'} — PIN and link stay the same.`
              : `Editing ${reissueGuestLabel || 'guest'} — PIN and link stay the same.`}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={onCancelReissue}>
            Cancel
          </Button>
        </div>
      ) : null}

      <SegmentedChipBar
        ariaLabel="Access dates detail"
        items={MODE_ITEMS.map((item) => ({
          ...item,
          disabled: modeLocked,
        }))}
        value={mode}
        onValueChange={(id) => onModeChange(id as GuestAccessFormMode)}
      />

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="guest-name">Guest name (optional)</Label>
          <Input
            id="guest-name"
            value={guestName}
            onChange={(event) => onGuestNameChange(event.target.value)}
            placeholder="Alex"
            autoComplete="off"
          />
        </div>

        <div className="space-y-1">
          <Label id="access-dates-label">Access dates</Label>
          {mode === 'walk-in' ? (
            <p
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
              aria-labelledby="access-dates-label"
            >
              {formatAccessPeriodSummary(checkInDate, checkOutDate)}
            </p>
          ) : (
            <GuestAccessDateRange
              compact
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              onChange={onDatesChange}
            />
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="bed-id">Bed</Label>
          <select
            id="bed-id"
            value={bedId}
            onChange={(event) => onBedIdChange(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {bedsByRoom.length === 0 ? (
              <option value="">No beds for these dates</option>
            ) : (
              bedsByRoom.map((group) => (
                <optgroup key={group.roomId} label={group.roomLabel}>
                  {group.beds.map((entry) => (
                    <option key={entry.bedId} value={entry.bedId}>
                      {entry.displayLabel}
                    </option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
        </div>

        <Button
          type="button"
          className="w-full"
          onClick={onSubmit}
          disabled={isPending || !canSubmit || (mode === 'custom' && !rangeValid)}
        >
          {submitLabel}
        </Button>
      </div>

      {bedsAvailabilityHint ? (
        <p className="text-xs text-muted-foreground">{bedsAvailabilityHint}</p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
