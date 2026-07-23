'use client';

import type { GuestAccessFormMode } from '../lib/guestAccessDates';
import { GuestAccessDateRange } from './GuestAccessDateRange';
import { Button, Input, Label, SegmentedChipBar } from '@/shared/ui';

interface BedOptionGroup {
  roomId: string;
  roomLabel: string;
  beds: Array<{ bedId: string; displayLabel: string }>;
}

const BOOKING_REFERENCE_HIDDEN_PLATFORM_IDS = new Set(['walk-in', 'direct']);

function showsBookingReference(platformId: string): boolean {
  const id = platformId.trim();
  return id.length > 0 && !BOOKING_REFERENCE_HIDDEN_PLATFORM_IDS.has(id);
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
  error: string | null;
  isPending: boolean;
  rangeValid: boolean;
  canSubmit: boolean;
  isReissue: boolean;
  isEditingReservation?: boolean;
  onSubmit: () => void;
}

export function resolveIssueGuestAccessSubmitLabel(props: {
  isPending: boolean;
  isEditingReservation: boolean;
  isReissue: boolean;
}): string {
  const { isPending, isEditingReservation, isReissue } = props;
  if (isPending) {
    if (isEditingReservation) return 'Saving…';
    if (isReissue) return 'Re-issuing…';
    return 'Creating…';
  }
  if (isEditingReservation) return 'Save reservation';
  if (isReissue) return 'Save new access';
  return 'Create booking';
}

export function IssueGuestAccessFormFields({
  layout = 'standalone',
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
  error,
  isEditingReservation = false,
}: Pick<
  IssueGuestAccessFormProps,
  | 'layout'
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
  | 'error'
  | 'isEditingReservation'
>) {
  const inShell = layout === 'shell';
  const showEditBanner = isEditingReservation && onCancelReissue && !inShell;
  const showBookingReference = showsBookingReference(bookingPlatformId);

  const handlePlatformChange = (nextPlatformId: string) => {
    onBookingPlatformIdChange(nextPlatformId);
    if (!showsBookingReference(nextPlatformId) && bookingExternalId) {
      onBookingExternalIdChange('');
    }
  };

  const fieldsGrid = (
    <div className={inShell ? 'space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0' : 'space-y-3'}>
      <div className="space-y-1">
        <Label htmlFor="guest-name">Booking name</Label>
        <p className="text-xs text-muted-foreground">The guest will see this name in the app.</p>
        <Input
          id="guest-name"
          value={guestName}
          onChange={(event) => onGuestNameChange(event.target.value)}
          placeholder="Alex"
          autoComplete="off"
          required
        />
      </div>

      {showBookingSourceFields ? (
        <>
          <div className="space-y-1 lg:col-span-2">
            <Label id="booking-platform-label">Booking platform</Label>
            <SegmentedChipBar
              ariaLabel="Booking platform"
              bleed={false}
              wrap
              className="px-0"
              items={bookingPlatformOptions.map((option) => ({
                id: option.id,
                label: option.label,
              }))}
              value={bookingPlatformId}
              onValueChange={handlePlatformChange}
            />
          </div>
          {showBookingReference ? (
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
          ) : null}
        </>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="booking-balance-due">Balance due</Label>
        <p className="text-xs text-muted-foreground">
          {isEditingReservation
            ? 'Remaining stay balance (optional). Not city tax.'
            : 'Remaining stay balance. Not city tax.'}
        </p>
        <Input
          id="booking-balance-due"
          value={bookingAmountDue}
          onChange={(event) => onBookingAmountDueChange(event.target.value)}
          placeholder={`e.g. 24.00 ${bookingBalanceCurrencySymbol}`.trim()}
          inputMode="decimal"
          autoComplete="off"
          required={!isEditingReservation}
        />
      </div>

      <div className="space-y-1 lg:col-span-2">
        <GuestAccessDateRange
          compact
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          onChange={onDatesChange}
        />
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

      {fieldsGrid}

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
    ...fieldsProps
  } = props;

  const submitLabel = resolveIssueGuestAccessSubmitLabel({
    isPending,
    isEditingReservation,
    isReissue,
  });

  if (layout === 'shell') {
    return <IssueGuestAccessFormFields layout="shell" {...fieldsProps} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold" title="Creates a booking and guest app access">
          New booking
        </h2>
      </div>

      <IssueGuestAccessFormFields
        layout="standalone"
        isEditingReservation={isEditingReservation}
        {...fieldsProps}
      />

      <Button
        type="button"
        className="w-full"
        onClick={onSubmit}
        disabled={isPending || !canSubmit || !rangeValid}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
