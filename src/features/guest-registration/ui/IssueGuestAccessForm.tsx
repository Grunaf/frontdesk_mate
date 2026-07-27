'use client';

import { useState } from 'react';
import type { GuestAccessFormMode } from '../lib/guestAccessDates';
import { GuestAccessDateRange } from './GuestAccessDateRange';
import { GuestProfilePicker } from './GuestProfilePicker';
import { Button, Input, Label, SegmentedChipBar, BedRoomGroupedSelect } from '@/shared/ui';
import type { BedRoomOptionGroup } from '@/shared/ui';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface StayOfferFormOption {
  id: string;
  title: string;
  availableBedCount: number;
}

const BOOKING_REFERENCE_HIDDEN_PLATFORM_IDS = new Set(['walk-in', 'direct']);
const DEFAULT_MAX_GUEST_COUNT = 8;

function showsBookingReference(platformId: string): boolean {
  const id = platformId.trim();
  return id.length > 0 && !BOOKING_REFERENCE_HIDDEN_PLATFORM_IDS.has(id);
}

export interface IssueGuestAccessFormProps {
  layout?: 'standalone' | 'shell';
  mode: GuestAccessFormMode;
  onModeChange: (mode: GuestAccessFormMode) => void;
  modeLocked: boolean;
  tenantSlug?: string;
  guestName: string;
  onGuestNameChange: (value: string) => void;
  selectedGuestId?: string | null;
  onSelectGuestProfile?: (guest: {
    id: string;
    display_name: string;
  }) => void;
  onClearGuestProfile?: () => void;
  bookingPlatformId: string;
  onBookingPlatformIdChange: (value: string) => void;
  bookingExternalId: string;
  onBookingExternalIdChange: (value: string) => void;
  bookingPlatformOptions: Array<{ id: string; label: string }>;
  showBookingSourceFields: boolean;
  bookingAmountDue: string;
  onBookingAmountDueChange: (value: string) => void;
  bookingBalanceCurrencySymbol: string;
  /** Stay offer selection (default path when offers are configured). */
  stayOfferOptions?: StayOfferFormOption[];
  offerId?: string;
  onOfferIdChange?: (value: string) => void;
  /** Lead / single bed (edit + Guests=1). */
  bedId: string;
  onBedIdChange: (value: string) => void;
  /** Multi-guest bed slots (create only). Length should match guestCount. */
  bedIds?: string[];
  onBedIdAtIndexChange?: (index: number, bedId: string) => void;
  /** Party size for create booking. Hidden while editing. */
  guestCount?: number;
  onGuestCountChange?: (value: number) => void;
  maxGuestCount?: number;
  bedsByRoom: BedRoomOptionGroup[];
  /** When true, Advanced bed picker starts open (move bed / manual). */
  advancedBedOpenDefault?: boolean;
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
  tenantSlug,
  guestName,
  onGuestNameChange,
  selectedGuestId = null,
  onSelectGuestProfile,
  onClearGuestProfile,
  bookingPlatformId,
  onBookingPlatformIdChange,
  bookingExternalId,
  onBookingExternalIdChange,
  bookingPlatformOptions,
  showBookingSourceFields,
  bookingAmountDue,
  onBookingAmountDueChange,
  bookingBalanceCurrencySymbol,
  stayOfferOptions = [],
  offerId = '',
  onOfferIdChange,
  bedId,
  onBedIdChange,
  bedIds,
  onBedIdAtIndexChange,
  guestCount = 1,
  onGuestCountChange,
  maxGuestCount = DEFAULT_MAX_GUEST_COUNT,
  bedsByRoom,
  advancedBedOpenDefault = false,
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
  | 'tenantSlug'
  | 'guestName'
  | 'onGuestNameChange'
  | 'selectedGuestId'
  | 'onSelectGuestProfile'
  | 'onClearGuestProfile'
  | 'bookingPlatformId'
  | 'onBookingPlatformIdChange'
  | 'bookingExternalId'
  | 'onBookingExternalIdChange'
  | 'bookingPlatformOptions'
  | 'showBookingSourceFields'
  | 'bookingAmountDue'
  | 'onBookingAmountDueChange'
  | 'bookingBalanceCurrencySymbol'
  | 'stayOfferOptions'
  | 'offerId'
  | 'onOfferIdChange'
  | 'bedId'
  | 'onBedIdChange'
  | 'bedIds'
  | 'onBedIdAtIndexChange'
  | 'guestCount'
  | 'onGuestCountChange'
  | 'maxGuestCount'
  | 'bedsByRoom'
  | 'advancedBedOpenDefault'
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
  const offerFirst = stayOfferOptions.length > 0 && Boolean(onOfferIdChange);
  const [advancedOpen, setAdvancedOpen] = useState(
    advancedBedOpenDefault || editIntent === 'moveBed' || !offerFirst
  );

  const selectedOffer = stayOfferOptions.find((option) => option.id === offerId);
  const offerHasNoBeds =
    offerFirst && Boolean(offerId) && (selectedOffer?.availableBedCount ?? 0) === 0;
  const partySize = Math.max(1, Math.min(guestCount, maxGuestCount));
  const multiGuest = !isEditingReservation && partySize > 1;
  const resolvedBedIds =
    bedIds && bedIds.length > 0
      ? bedIds
      : Array.from({ length: partySize }, (_, i) => (i === 0 ? bedId : ''));
  const assignedBedsLabel = resolvedBedIds.filter(Boolean).join(', ');

  const handlePlatformChange = (nextPlatformId: string) => {
    onBookingPlatformIdChange(nextPlatformId);
    if (!showsBookingReference(nextPlatformId) && bookingExternalId) {
      onBookingExternalIdChange('');
    }
  };

  const bedsByRoomExcluding = (
    excludeBedIds: Set<string>,
    keepBedId: string
  ): BedRoomOptionGroup[] =>
    bedsByRoom
      .map((group) => ({
        ...group,
        beds: group.beds.filter(
          (bed) => bed.bedId === keepBedId || !excludeBedIds.has(bed.bedId)
        ),
      }))
      .filter((group) => group.beds.length > 0);

  const singleBedSelect = (
    <BedRoomGroupedSelect
      label={offerFirst ? 'Specific bed' : 'Bed'}
      hint={
        offerFirst
          ? 'Overrides auto-assign for this booking. Leave closed to pick any free bed in the offer.'
          : null
      }
      bedId={bedId}
      onBedIdChange={onBedIdChange}
      bedsByRoom={bedsByRoom}
    />
  );

  const multiBedSelects = (
    <div className="space-y-3">
      {resolvedBedIds.map((slotBedId, index) => {
        const taken = new Set(resolvedBedIds.filter((id, i) => i !== index && Boolean(id)));
        return (
          <BedRoomGroupedSelect
            key={`guest-bed-${index}`}
            label={index === 0 ? 'Guest 1 bed' : `Guest ${index + 1} bed`}
            hint={index === 0 ? 'Lead guest bed.' : null}
            bedId={slotBedId}
            onBedIdChange={(next) => {
              if (onBedIdAtIndexChange) {
                onBedIdAtIndexChange(index, next);
                return;
              }
              if (index === 0) onBedIdChange(next);
            }}
            bedsByRoom={bedsByRoomExcluding(taken, slotBedId)}
          />
        );
      })}
    </div>
  );

  const bedSelect = multiGuest ? multiBedSelects : singleBedSelect;

  const fieldsGrid = (
    <div
      className={
        inShell
          ? 'space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0'
          : 'space-y-3'
      }
    >
      <div className="space-y-1">
        {tenantSlug && onSelectGuestProfile && onClearGuestProfile ? (
          <GuestProfilePicker
            tenantSlug={tenantSlug}
            guestName={guestName}
            onGuestNameChange={onGuestNameChange}
            selectedGuestId={selectedGuestId}
            onSelectGuest={onSelectGuestProfile}
            onClearGuest={onClearGuestProfile}
          />
        ) : (
          <>
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
          </>
        )}
      </div>

      {!isEditingReservation && onGuestCountChange ? (
        <div className="space-y-1">
          <Label htmlFor="guest-count">Guests</Label>
          <p className="text-xs text-muted-foreground">
            One bed per guest. Extra guests can be named later in tourism.
          </p>
          <select
            id="guest-count"
            value={partySize}
            onChange={(event) => onGuestCountChange(Number(event.target.value))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {Array.from({ length: maxGuestCount }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      ) : null}

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
              <p className="text-xs text-muted-foreground">OTA confirmation number.</p>
              <Input
                id="booking-external-id"
                value={bookingExternalId}
                onChange={(event) => onBookingExternalIdChange(event.target.value)}
                placeholder="e.g. 1234567890"
                autoComplete="off"
                required
              />
            </div>
          ) : null}
        </>
      ) : null}

      {offerFirst ? (
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="stay-offer-id">Stay offer</Label>
          <p className="text-xs text-muted-foreground">
            {multiGuest
              ? 'Free beds in this group are assigned automatically.'
              : 'A free bed in this group is assigned automatically.'}
          </p>
          <select
            id="stay-offer-id"
            value={offerId}
            onChange={(event) => onOfferIdChange?.(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {stayOfferOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
                {option.availableBedCount === 0 ? ' (full)' : ` · ${option.availableBedCount} free`}
              </option>
            ))}
          </select>
          {offerHasNoBeds ? (
            <p className="text-xs text-destructive">No free beds in this offer for these dates.</p>
          ) : assignedBedsLabel ? (
            <p className="text-xs text-muted-foreground">
              {multiGuest ? 'Assigned beds: ' : 'Assigned bed: '}
              {assignedBedsLabel}
            </p>
          ) : null}
        </div>
      ) : null}

      {offerFirst ? (
        <div className="space-y-2 lg:col-span-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 py-1 text-left text-sm text-muted-foreground hover:text-foreground"
          >
            {multiGuest ? 'Advanced · pick beds' : 'Advanced · pick specific bed'}
            <ChevronDown
              className={cn('size-4 shrink-0 transition-transform', advancedOpen && 'rotate-180')}
            />
          </button>
          {advancedOpen ? bedSelect : null}
        </div>
      ) : (
        bedSelect
      )}

      <div className="space-y-1 lg:col-span-2">
        <GuestAccessDateRange
          compact
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          onChange={onDatesChange}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="booking-balance-due">Balance due</Label>
        <p className="text-xs text-muted-foreground">
          Remaining stay balance
          {multiGuest ? ' for the whole party' : ''}. Not city tax.
        </p>
        <Input
          id="booking-balance-due"
          value={bookingAmountDue}
          onChange={(event) => onBookingAmountDueChange(event.target.value)}
          placeholder={`e.g. 24.00 ${bookingBalanceCurrencySymbol}`.trim()}
          inputMode="decimal"
          autoComplete="off"
          required
        />
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
