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

export interface IssueGuestAccessFormProps {
  layout?: 'standalone' | 'shell';
  mode: GuestAccessFormMode;
  onModeChange: (mode: GuestAccessFormMode) => void;
  modeLocked: boolean;
  guestName: string;
  onGuestNameChange: (value: string) => void;
  bookingPlatformId: string;
  onBookingPlatformIdChange: (value: string) => void;
  bookingExternalId: string;
  onBookingExternalIdChange: (value: string) => void;
  bookingPlatformOptions: Array<{ id: string; label: string }>;
  showBookingSourceFields: boolean;
  bookingAmountDue: string;
  onBookingAmountDueChange: (value: string) => void;
  bookingBalanceCurrencySymbol: string;
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

export function resolveIssueGuestAccessSubmitLabel(props: {
  isPending: boolean;
  isEditingReservation: boolean;
  isReissue: boolean;
}): string {
  const { isPending, isEditingReservation, isReissue } = props;
  if (isPending) {
    if (isEditingReservation) return 'Saving…';
    if (isReissue) return 'Re-issuing…';
    return 'Issuing…';
  }
  if (isEditingReservation) return 'Save reservation';
  if (isReissue) return 'Save new access';
  return 'Issue access';
}

export function IssueGuestAccessFormFields({
  layout = 'standalone',
  mode,
  onModeChange,
  modeLocked,
  guestName,
  onGuestNameChange,
  bookingPlatformId,
  onBookingPlatformIdChange,
  bookingExternalId,
  onBookingExternalIdChange,
  bookingPlatformOptions,
  showBookingSourceFields,
  bookingAmountDue,
  onBookingAmountDueChange,
  bookingBalanceCurrencySymbol,
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
  isEditingReservation = false,
}: Pick<
  IssueGuestAccessFormProps,
  | 'layout'
  | 'mode'
  | 'onModeChange'
  | 'modeLocked'
  | 'guestName'
  | 'onGuestNameChange'
  | 'bookingPlatformId'
  | 'onBookingPlatformIdChange'
  | 'bookingExternalId'
  | 'onBookingExternalIdChange'
  | 'bookingPlatformOptions'
  | 'showBookingSourceFields'
  | 'bookingAmountDue'
  | 'onBookingAmountDueChange'
  | 'bookingBalanceCurrencySymbol'
  | 'bedId'
  | 'onBedIdChange'
  | 'bedsByRoom'
  | 'checkInDate'
  | 'checkOutDate'
  | 'onDatesChange'
  | 'reissueGuestLabel'
  | 'editIntent'
  | 'onCancelReissue'
  | 'bedsAvailabilityHint'
  | 'error'
  | 'isEditingReservation'
>) {
  const inShell = layout === 'shell';
  const showEditBanner = isEditingReservation && onCancelReissue && !inShell;

  const fieldsGrid = (
    <div className={inShell ? 'space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0' : 'space-y-3'}>
      <div className="space-y-1">
        <Label htmlFor="guest-name">Booking name (optional)</Label>
        <p className="text-xs text-muted-foreground">The guest will see this name in the app.</p>
        <Input
          id="guest-name"
          value={guestName}
          onChange={(event) => onGuestNameChange(event.target.value)}
          placeholder="Alex"
          autoComplete="off"
        />
      </div>

      {showBookingSourceFields ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="booking-platform">Booking platform</Label>
            <select
              id="booking-platform"
              value={bookingPlatformId}
              onChange={(event) => onBookingPlatformIdChange(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Not set</option>
              {bookingPlatformOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="booking-external-id">Booking reference</Label>
            <p className="text-xs text-muted-foreground">OTA confirmation number (optional).</p>
            <Input
              id="booking-external-id"
              value={bookingExternalId}
              onChange={(event) => onBookingExternalIdChange(event.target.value)}
              placeholder="e.g. 1234567890"
              autoComplete="off"
            />
          </div>
        </>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="booking-balance-due">Balance due</Label>
        <p className="text-xs text-muted-foreground">
          Remaining stay balance (optional). Not city tax.
        </p>
        <Input
          id="booking-balance-due"
          value={bookingAmountDue}
          onChange={(event) => onBookingAmountDueChange(event.target.value)}
          placeholder={`e.g. 24.00 ${bookingBalanceCurrencySymbol}`.trim()}
          inputMode="decimal"
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
    </div>
  );

  return (
    <div className="space-y-3">
      {showEditBanner ? (
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

      {fieldsGrid}

      {bedsAvailabilityHint ? (
        <p className="text-xs text-muted-foreground">{bedsAvailabilityHint}</p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function IssueGuestAccessForm(props: IssueGuestAccessFormProps) {
  const {
    layout = 'standalone',
    isPending,
    rangeValid,
    canSubmit,
    isReissue,
    isEditingReservation = false,
    onSubmit,
    mode,
    ...fieldsProps
  } = props;

  const submitLabel = resolveIssueGuestAccessSubmitLabel({
    isPending,
    isEditingReservation,
    isReissue,
  });

  if (layout === 'shell') {
    return <IssueGuestAccessFormFields layout="shell" mode={mode} {...fieldsProps} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold" title="App access only — not your booking system">
          Issue guest access
        </h2>
      </div>

      <IssueGuestAccessFormFields
        layout="standalone"
        mode={mode}
        isEditingReservation={isEditingReservation}
        {...fieldsProps}
      />

      <Button
        type="button"
        className="w-full"
        onClick={onSubmit}
        disabled={isPending || !canSubmit || (mode === 'custom' && !rangeValid)}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
