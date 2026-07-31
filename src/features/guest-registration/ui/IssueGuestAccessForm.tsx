'use client';

import { useEffect, useState } from 'react';
import type { GuestAccessFormMode } from '../lib/guestAccessDates';
import { GuestAccessDateRange } from './GuestAccessDateRange';
import { GuestProfilePicker } from './GuestProfilePicker';
import {
  Button,
  Input,
  Label,
  NumberStepper,
  SegmentedChipBar,
  BedRoomGroupedSelect,
} from '@/shared/ui';
import type { BedRoomOptionGroup } from '@/shared/ui';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { buildWhatsappMeHref } from '@/shared/lib';
import { GuestPhoneNumberField } from '@/features/guest-stay-contact';
import { validateTourismWhatsapp } from '@/features/guest-tourism-registration';

export interface StayOfferFormOption {
  id: string;
  title: string;
  availableBedCount: number;
  bookingUnit?: 'bed' | 'room';
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
  /** Confirmed phone draft (E.164-ish). Required with email: at least one. */
  contactPhone?: string;
  onContactPhoneChange?: (value: string) => void;
  contactEmail?: string;
  onContactEmailChange?: (value: string) => void;
  /** Explicit opt-out when OTA has no usable guest contact. */
  contactSkipped?: boolean;
  onContactSkippedChange?: (skipped: boolean) => void;
  bookingPlatformId: string;
  onBookingPlatformIdChange: (value: string) => void;
  bookingExternalId: string;
  onBookingExternalIdChange: (value: string) => void;
  /** Hostelworld 6-digit property prefix when already configured. */
  hostelworldBookingPrefix?: string | null;
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
  /** Multi-guest bed slots (create + party edit). Length should match guestCount. */
  bedIds?: string[];
  onBedIdAtIndexChange?: (index: number, bedId: string) => void;
  /** Labels for party bed slots while editing a group (Guest name · current bed). */
  partyBedLabels?: string[];
  /** Party size for create booking. Hidden while editing (except party multi-bed). */
  guestCount?: number;
  onGuestCountChange?: (value: number) => void;
  maxGuestCount?: number;
  guestsReducedMessage?: string | null;
  placementWarning?: string | null;
  privateRoomCta?: { label: string; onClick: () => void } | null;
  bedsByRoom: BedRoomOptionGroup[];
  /** When true, Advanced bed picker starts open (move bed / manual). */
  advancedBedOpenDefault?: boolean;
  checkInDate: string;
  checkOutDate: string;
  onDatesChange: (next: { checkInDate: string; checkOutDate: string }) => void;
  reissueGuestLabel?: string;
  editIntent?: 'moveBed' | 'changeDates';
  /** Child of a party: hint that shared fields edit from Group. */
  moveBedGroupHint?: boolean;
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
  editIntent?: 'moveBed' | 'changeDates';
}): string {
  const { isPending, isEditingReservation, isReissue, editIntent } = props;
  if (isPending) {
    if (isEditingReservation) return 'Saving…';
    if (isReissue) return 'Re-issuing…';
    return 'Creating…';
  }
  if (isEditingReservation) {
    return editIntent === 'moveBed' ? 'Save bed' : 'Save reservation';
  }
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
  contactPhone = '',
  onContactPhoneChange,
  contactEmail = '',
  onContactEmailChange,
  contactSkipped = false,
  onContactSkippedChange,
  bookingPlatformId,
  onBookingPlatformIdChange,
  bookingExternalId,
  onBookingExternalIdChange,
  hostelworldBookingPrefix = null,
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
  partyBedLabels,
  guestCount = 1,
  onGuestCountChange,
  maxGuestCount = DEFAULT_MAX_GUEST_COUNT,
  guestsReducedMessage = null,
  placementWarning = null,
  privateRoomCta = null,
  bedsByRoom,
  advancedBedOpenDefault = false,
  checkInDate,
  checkOutDate,
  onDatesChange,
  reissueGuestLabel,
  editIntent = 'changeDates',
  moveBedGroupHint = false,
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
  | 'contactPhone'
  | 'onContactPhoneChange'
  | 'contactEmail'
  | 'onContactEmailChange'
  | 'contactSkipped'
  | 'onContactSkippedChange'
  | 'bookingPlatformId'
  | 'onBookingPlatformIdChange'
  | 'bookingExternalId'
  | 'onBookingExternalIdChange'
  | 'hostelworldBookingPrefix'
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
  | 'partyBedLabels'
  | 'guestCount'
  | 'onGuestCountChange'
  | 'maxGuestCount'
  | 'guestsReducedMessage'
  | 'placementWarning'
  | 'privateRoomCta'
  | 'bedsByRoom'
  | 'advancedBedOpenDefault'
  | 'checkInDate'
  | 'checkOutDate'
  | 'onDatesChange'
  | 'reissueGuestLabel'
  | 'editIntent'
  | 'moveBedGroupHint'
  | 'onCancelReissue'
  | 'error'
  | 'isEditingReservation'
>) {
  const inShell = layout === 'shell';
  const showEditBanner = isEditingReservation && onCancelReissue && !inShell;
  const showBookingReference = showsBookingReference(bookingPlatformId);
  const offerFirst =
    !isEditingReservation && stayOfferOptions.length > 0 && Boolean(onOfferIdChange);
  const [advancedOpen, setAdvancedOpen] = useState(
    advancedBedOpenDefault || editIntent === 'moveBed' || !offerFirst
  );
  const [emailFieldOpen, setEmailFieldOpen] = useState(() => Boolean(contactEmail.trim()));

  useEffect(() => {
    if (advancedBedOpenDefault || editIntent === 'moveBed' || isEditingReservation) {
      setAdvancedOpen(true);
    }
  }, [advancedBedOpenDefault, editIntent, isEditingReservation]);

  useEffect(() => {
    if (contactEmail.trim()) {
      setEmailFieldOpen(true);
    }
  }, [contactEmail]);

  const showContactFields = Boolean(onContactPhoneChange);
  const phoneValid = validateTourismWhatsapp(contactPhone).ok;
  const whatsappHref = phoneValid ? buildWhatsappMeHref(contactPhone) : null;

  const selectedOffer = stayOfferOptions.find((option) => option.id === offerId);
  const offerHasNoBeds =
    offerFirst && Boolean(offerId) && (selectedOffer?.availableBedCount ?? 0) === 0;
  const partySize = Math.max(1, Math.min(guestCount, maxGuestCount));
  const editingPartyBeds =
    isEditingReservation && editIntent === 'changeDates' && (bedIds?.length ?? 0) > 1;
  const multiGuest =
    partySize > 1 && (!isEditingReservation || editingPartyBeds) && editIntent !== 'moveBed';
  const resolvedBedIds =
    bedIds && bedIds.length > 0
      ? bedIds
      : Array.from({ length: partySize }, (_, i) => (i === 0 ? bedId : ''));
  const bedDisplayLabelById = new Map(
    bedsByRoom.flatMap((group) => group.beds.map((bed) => [bed.bedId, bed.displayLabel] as const))
  );
  const assignedBedsLabel = resolvedBedIds
    .filter(Boolean)
    .map((id) => bedDisplayLabelById.get(id) ?? id)
    .join(', ');

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

  const bedSelect = multiGuest ? (
    <div key="beds-multi" className="space-y-3">
      {resolvedBedIds.map((slotBedId, index) => {
        const taken = new Set(resolvedBedIds.filter((id, i) => i !== index && Boolean(id)));
        const slotLabel =
          partyBedLabels?.[index]?.trim() ||
          (index === 0 ? 'Guest 1 bed' : `Guest ${index + 1} bed`);
        return (
          <BedRoomGroupedSelect
            key={`guest-bed-${index}`}
            id={`guest-bed-${index}`}
            label={slotLabel}
            hint={
              editingPartyBeds
                ? null
                : index === 0
                  ? 'Lead guest bed.'
                  : null
            }
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
  ) : (
    <BedRoomGroupedSelect
      key="beds-single"
      id="bed-id"
      label={offerFirst ? 'Specific bed' : 'Bed'}
      hint={
        offerFirst
          ? 'Overrides auto-assign. Beds held by a whole-room booking need confirmation.'
          : null
      }
      bedId={bedId}
      onBedIdChange={onBedIdChange}
      bedsByRoom={bedsByRoom}
    />
  );

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

      {showContactFields ? (
        <div className="space-y-3 lg:col-span-2">
          {contactSkipped ? (
            <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/30 px-3 py-2.5">
              <p className="text-sm text-muted-foreground">
                No guest contact on this OTA booking — phone and email skipped.
              </p>
              {onContactSkippedChange ? (
                <button
                  type="button"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => onContactSkippedChange(false)}
                >
                  Add a contact instead
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Phone or email — at least one required.
                  </p>
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      Open WhatsApp
                    </a>
                  ) : null}
                </div>
                <GuestPhoneNumberField
                  id="contact-phone"
                  countrySelectId="contact-phone-country"
                  value={contactPhone}
                  onChange={(next) => onContactPhoneChange?.(next)}
                  label="Phone (WhatsApp)"
                  countryLabel="Country"
                  locale="en"
                />
              </div>

              {emailFieldOpen && onContactEmailChange ? (
                <div className="space-y-1">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => onContactEmailChange(event.target.value)}
                    placeholder="guest@example.com"
                    autoComplete="off"
                  />
                </div>
              ) : null}

              {(onContactEmailChange && !emailFieldOpen) || onContactSkippedChange ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {onContactEmailChange && !emailFieldOpen ? (
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => setEmailFieldOpen(true)}
                    >
                      Add email
                    </button>
                  ) : null}
                  {onContactEmailChange && !emailFieldOpen && onContactSkippedChange ? (
                    <span className="text-muted-foreground/50" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {onContactSkippedChange ? (
                    <button
                      type="button"
                      className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={() => {
                        onContactPhoneChange?.('');
                        onContactEmailChange?.('');
                        setEmailFieldOpen(false);
                        onContactSkippedChange(true);
                      }}
                    >
                      No contact on OTA
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-1 lg:col-span-2">
        <GuestAccessDateRange
          compact
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          onChange={onDatesChange}
        />
      </div>

      {!isEditingReservation && onGuestCountChange ? (
        <div className="space-y-1">
          <Label id="guest-count-label">Guests</Label>
          <p className="text-xs text-muted-foreground">
            One bed per guest. Extra guests can be named later in tourism.
            {maxGuestCount > 1 ? ` Max ${maxGuestCount} for these dates.` : null}
          </p>
          <NumberStepper
            id="guest-count"
            ariaLabel="Guests"
            value={partySize}
            min={1}
            max={maxGuestCount}
            onValueChange={onGuestCountChange}
          />
          {guestsReducedMessage ? (
            <p className="text-xs text-muted-foreground">{guestsReducedMessage}</p>
          ) : null}
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
            bookingPlatformId === 'hostelworld' ? (
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="booking-external-id">Hostelworld booking number</Label>
                {hostelworldBookingPrefix ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Property prefix is fixed. Paste the full number or only the unique part.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={`${hostelworldBookingPrefix}-`}
                        disabled
                        readOnly
                        aria-label="Hostelworld property prefix"
                        className="w-[8.25rem] shrink-0 font-mono"
                      />
                      <Input
                        id="booking-external-id"
                        value={bookingExternalId}
                        onChange={(event) => {
                          const raw = event.target.value.trim().replace(/\s+/g, '');
                          const afterPrefix = raw.startsWith(hostelworldBookingPrefix)
                            ? raw.slice(hostelworldBookingPrefix.length)
                            : raw;
                          onBookingExternalIdChange(afterPrefix.replace(/-/g, ''));
                        }}
                        placeholder="Unique booking part"
                        autoComplete="off"
                        className="font-mono"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Paste the full Hostelworld number. The first 6 digits will be saved as this
                      hostel&apos;s prefix.
                    </p>
                    <Input
                      id="booking-external-id"
                      value={bookingExternalId}
                      onChange={(event) =>
                        onBookingExternalIdChange(event.target.value.trim().replace(/\s+/g, ''))
                      }
                      placeholder="e.g. 12345678901"
                      autoComplete="off"
                      className="font-mono"
                      required
                    />
                  </>
                )}
              </div>
            ) : (
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
            )
          ) : null}
        </>
      ) : null}

      {offerFirst ? (
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="stay-offer-id">Stay offer</Label>
          <p className="text-xs text-muted-foreground">
            {selectedOffer?.bookingUnit === 'room'
              ? 'Empty private room is held as a whole. Priced per room.'
              : multiGuest
                ? 'Beds are assigned in one room when possible, then split if needed.'
                : 'A free bed in this group is assigned automatically.'}
          </p>
          <select
            id="stay-offer-id"
            value={offerId}
            onChange={(event) => onOfferIdChange?.(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {stayOfferOptions.some((option) => (option.bookingUnit ?? 'bed') === 'bed') ? (
              <optgroup label="Dorms">
                {stayOfferOptions
                  .filter((option) => (option.bookingUnit ?? 'bed') === 'bed')
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                      {option.availableBedCount === 0
                        ? ' (full)'
                        : ` · ${option.availableBedCount} free`}
                    </option>
                  ))}
              </optgroup>
            ) : null}
            {stayOfferOptions.some((option) => option.bookingUnit === 'room') ? (
              <optgroup label="Private rooms">
                {stayOfferOptions
                  .filter((option) => option.bookingUnit === 'room')
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                      {option.availableBedCount === 0
                        ? ' (full)'
                        : ` · ${option.availableBedCount} free`}
                    </option>
                  ))}
              </optgroup>
            ) : null}
          </select>
          {placementWarning ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">{placementWarning}</p>
              {privateRoomCta ? (
                <Button type="button" size="sm" variant="outline" onClick={privateRoomCta.onClick}>
                  {privateRoomCta.label}
                </Button>
              ) : null}
            </div>
          ) : offerHasNoBeds ? (
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

      {isEditingReservation && editIntent === 'moveBed' ? (
        <div className="space-y-3">
          {moveBedGroupHint ? (
            <p className="text-xs text-muted-foreground">
              Dates, balance, contact, and booking source are edited from the Group sheet.
            </p>
          ) : null}
          {bedSelect}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
      ) : (
        <>
          {fieldsGrid}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </>
      )}
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
    editIntent: fieldsProps.editIntent,
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
