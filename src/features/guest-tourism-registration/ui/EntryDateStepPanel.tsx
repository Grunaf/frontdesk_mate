'use client';

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ENTRY_TRANSPORT_TYPES,
  type EntryDetailsStatus,
  type EntryTransportType,
} from '@/entities/guest-tourism-registration';
import {
  resolveTourismRegistrationConfig,
  useTenant,
} from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  Alert,
  AlertDescription,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  IconBackActionsRow,
} from '@/shared/ui';
import {
  listTourismGuestsForSessionAction,
  type TourismEntryDetailsDto,
  type TourismGuestListItem,
} from '../actions/listTourismGuestsForSessionAction';
import { saveGuestEntryDetailsAction } from '../actions/saveGuestEntryStampDateAction';
import { getTourismEntryPointsCatalog } from '../lib/tourismEntryPointsCatalog';
import { DEFAULT_TOURISM_PROFILE_ID } from '../model/tourismRegistrationProfiles';
import {
  ArrivalDatesFields,
  buildArrivalDatesPayload,
  resolveInitialArrivalMode,
  resolveInitialPerGuestDates,
  resolveInitialSameDayDate,
  type ArrivalDatesGuestDraft,
  type ArrivalDatesMode,
} from './ArrivalDatesFields';
import { EntryStampHelpSheet } from './EntryStampHelpSheet';
import { EntryStampPageFields, EntryTransportPointFields } from './EntryDetailsFields';

export type EntryDateNavigationMode = 'standalone' | 'wizard';

function toArrivalDrafts(guests: TourismGuestListItem[]): ArrivalDatesGuestDraft[] {
  return guests.map((guest) => ({
    id: guest.id,
    label: `${guest.firstName} ${guest.lastName}`.trim(),
    entryStampDate: guest.entryStampDate,
  }));
}

function toStampPages(guests: TourismGuestListItem[]): Record<string, string> {
  return Object.fromEntries(
    guests.map((guest) => [
      guest.id,
      guest.entryStampPage != null ? String(guest.entryStampPage) : '',
    ])
  );
}

type EntryDateStepPanelProps = {
  tenantSlug: string;
  entryDateComplete?: boolean;
  onComplete: (savedEntryStampDate: string | null) => void;
  interactionEnabled?: boolean;
  onBack?: () => void;
  navigationMode?: EntryDateNavigationMode;
  showIntroHeading?: boolean;
  /**
   * Live/SSR guest list from registration accordion.
   * When provided (including `[]`), used as initial state; panel still refreshes from server.
   */
  guests?: TourismGuestListItem[];
  /** Rendered under primary in the pinned bottom chrome (e.g. next accordion). */
  bottomAccessory?: ReactNode;
  className?: string;
};

export function EntryDateStepPanel({
  tenantSlug,
  entryDateComplete = false,
  onComplete,
  interactionEnabled = true,
  onBack,
  showIntroHeading = true,
  guests: guestsProp,
  bottomAccessory,
  className,
}: EntryDateStepPanelProps) {
  const t = useTranslations('pages.staySetup.entryDate');
  const { settings } = useTenant();
  const tourismConfig = resolveTourismRegistrationConfig(settings);
  const profileId = tourismConfig?.profileId ?? DEFAULT_TOURISM_PROFILE_ID;
  const catalog = getTourismEntryPointsCatalog(profileId);
  const stampHelpImageUrl = tourismConfig?.entryStampHelpImage ?? null;

  const hasProvidedGuests = guestsProp !== undefined;
  const initialDrafts = hasProvidedGuests ? toArrivalDrafts(guestsProp) : [];

  const [guests, setGuests] = useState<ArrivalDatesGuestDraft[]>(() => initialDrafts);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !hasProvidedGuests);
  const [mode, setMode] = useState<ArrivalDatesMode>(() =>
    hasProvidedGuests ? resolveInitialArrivalMode(initialDrafts) : 'same'
  );
  const [sameDayDate, setSameDayDate] = useState(() =>
    hasProvidedGuests ? resolveInitialSameDayDate(initialDrafts) : ''
  );
  const [perGuestDates, setPerGuestDates] = useState<Record<string, string>>(() =>
    hasProvidedGuests ? resolveInitialPerGuestDates(initialDrafts) : {}
  );
  const [transportType, setTransportType] = useState<EntryTransportType | ''>('');
  const [entryPointCode, setEntryPointCode] = useState('');
  const [entryPointLabel, setEntryPointLabel] = useState('');
  const [stampPages, setStampPages] = useState<Record<string, string>>(() =>
    hasProvidedGuests ? toStampPages(guestsProp) : {}
  );
  const [entryDetailsStatus, setEntryDetailsStatus] = useState<EntryDetailsStatus | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [stampPageError, setStampPageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stampHelpOpen, setStampHelpOpen] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  const isFullyComplete = entryDetailsStatus === 'complete' || (entryDateComplete && entryDetailsStatus !== 'skipped');
  const isLocked = isFullyComplete && guests.length > 0;
  const panelTopPadding = showIntroHeading ? 'pt-2' : 'pt-0';

  const applyEntryDetails = useCallback((details: TourismEntryDetailsDto) => {
    setTransportType(details.transportType ?? '');
    setEntryPointCode(details.entryPointCode ?? '');
    setEntryPointLabel(details.entryPointLabel ?? '');
    setEntryDetailsStatus(details.status);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!hasProvidedGuests) {
      setIsLoading(true);
    }
    setLoadError(null);

    void listTourismGuestsForSessionAction(tenantSlug).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadError(t('errors.generic'));
        setIsLoading(false);
        return;
      }

      const nextGuests = toArrivalDrafts(result.guests);
      setGuests(nextGuests);
      setMode(resolveInitialArrivalMode(nextGuests));
      setSameDayDate(resolveInitialSameDayDate(nextGuests));
      setPerGuestDates(resolveInitialPerGuestDates(nextGuests));
      setStampPages(toStampPages(result.guests));
      applyEntryDetails(result.entryDetails);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, t, hasProvidedGuests, applyEntryDetails]);

  const transportLabels = useMemo(
    () =>
      Object.fromEntries(
        ENTRY_TRANSPORT_TYPES.map((value) => [value, t(`transport.${value}`)])
      ) as Record<EntryTransportType, string>,
    [t]
  );

  const handleTransportChange = useCallback((value: EntryTransportType) => {
    setTransportType(value);
    setEntryPointCode('');
    setEntryPointLabel('');
    setDetailsError(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!interactionEnabled || isLocked) {
      return;
    }

    setSaveError(null);
    setDateError(null);
    setDetailsError(null);
    setStampPageError(null);

    const built = buildArrivalDatesPayload({
      mode: guests.length <= 1 ? 'same' : mode,
      guests,
      sameDayDate,
      perGuestDates,
    });
    if (!built.ok) {
      setDateError(t('errors.invalidDate'));
      return;
    }

    if (!transportType) {
      setDetailsError(t('errors.invalidTransport'));
      return;
    }

    const stampPagesPayload: Record<string, number | null> = {};
    for (const guest of guests) {
      const raw = (stampPages[guest.id] ?? '').trim();
      stampPagesPayload[guest.id] = raw ? Number(raw) : null;
    }

    const datesPayload =
      built.payload.mode === 'same'
        ? { ...built.payload, stampPages: stampPagesPayload }
        : {
            mode: 'different' as const,
            dates: built.payload.dates.map((item) => ({
              ...item,
              entryStampPage: stampPagesPayload[item.guestId] ?? null,
            })),
          };

    startSaveTransition(async () => {
      const result = await saveGuestEntryDetailsAction(tenantSlug, {
        intent: 'save',
        transportType,
        entryPointCode: transportType === 'plane' ? entryPointCode : null,
        entryPointLabel,
        dates: datesPayload,
      });
      if (!result.ok) {
        if (result.error === 'invalid_date') {
          setDateError(t('errors.invalidDate'));
        } else if (result.error === 'invalid_transport') {
          setDetailsError(t('errors.invalidTransport'));
        } else if (result.error === 'invalid_entry_point') {
          setDetailsError(t('errors.invalidEntryPoint'));
        } else if (result.error === 'invalid_stamp_page') {
          setStampPageError(t('errors.invalidStampPage'));
        } else if (result.error === 'no_catalog') {
          setDetailsError(t('errors.noCatalog'));
        } else {
          setSaveError(t('errors.generic'));
        }
        return;
      }
      setEntryDetailsStatus(result.entryDetailsStatus);
      onComplete(result.entryStampDate);
    });
  }, [
    entryPointCode,
    entryPointLabel,
    guests,
    interactionEnabled,
    isLocked,
    mode,
    onComplete,
    perGuestDates,
    sameDayDate,
    stampPages,
    t,
    tenantSlug,
    transportType,
  ]);

  const handleSkipConfirm = useCallback(() => {
    if (!interactionEnabled || isLocked) {
      return;
    }
    setSkipConfirmOpen(false);
    setSaveError(null);
    startSaveTransition(async () => {
      const result = await saveGuestEntryDetailsAction(tenantSlug, { intent: 'skip' });
      if (!result.ok) {
        setSaveError(t('errors.generic'));
        return;
      }
      setEntryDetailsStatus(result.entryDetailsStatus);
      onComplete(result.entryStampDate);
    });
  }, [interactionEnabled, isLocked, onComplete, t, tenantSlug]);

  const handleContinueWhenLocked = useCallback(() => {
    onComplete(resolveInitialSameDayDate(guests) || null);
  }, [guests, onComplete]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', panelTopPadding, className)}>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        {showIntroHeading ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
        )}

        {entryDetailsStatus === 'skipped' && !isLocked ? (
          <Alert>
            <AlertDescription>{t('skippedHint')}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : guests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('emptyGuests')}</p>
        ) : (
          <>
            <EntryTransportPointFields
              catalog={catalog}
              copy={{
                transportLegend: t('transportLegend'),
                transportLabels,
                entryPointLabel: t('entryPointLabel'),
                entryPointAirportHint: t('entryPointAirportHint'),
                entryPointPlaceHint: t('entryPointPlaceHint'),
                entryPointAirportPlaceholder: t('entryPointAirportPlaceholder'),
                entryPointPlacePlaceholder: t('entryPointPlacePlaceholder'),
              }}
              disabled={!interactionEnabled || isSaving}
              locked={isLocked}
              transportType={transportType}
              onTransportTypeChange={handleTransportChange}
              entryPointCode={entryPointCode}
              entryPointLabel={entryPointLabel}
              onEntryPointChange={({ code, label }) => {
                setEntryPointCode(code);
                setEntryPointLabel(label);
                setDetailsError(null);
              }}
              fieldError={detailsError}
            />

            <ArrivalDatesFields
              guests={guests}
              copy={{
                modeLegend: t('modeLegend'),
                modeSame: t('modeSame'),
                modeDifferent: t('modeDifferent'),
                dateLabel: t('dateLabel'),
                hint: t('hint'),
                hintDifferent: t('hintDifferent'),
                savedBadge: t('savedBadge'),
              }}
              disabled={!interactionEnabled || isSaving}
              locked={isLocked}
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

            <EntryStampPageFields
              copy={{
                stampPageLabel: t('stampPageLabel'),
                stampPageHint: t('stampPageHint'),
                stampHelpLink: t('stampHelpLink'),
                formatStampPageGuestLabel: (name) => t('stampPageGuestLabel', { name }),
              }}
              disabled={!interactionEnabled || isSaving}
              locked={isLocked}
              guests={guests}
              stampPages={stampPages}
              onStampPageChange={(guestId, value) => {
                setStampPages((current) => ({ ...current, [guestId]: value }));
                setStampPageError(null);
              }}
              onOpenStampHelp={() => setStampHelpOpen(true)}
              fieldError={stampPageError}
            />
          </>
        )}

        {saveError ? (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="mt-auto shrink-0 space-y-3 pt-4">
        <IconBackActionsRow onBack={onBack}>
          <Button
            size="lg"
            disabled={!interactionEnabled || isSaving || isLoading || guests.length === 0}
            onClick={isLocked ? handleContinueWhenLocked : handleSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('saving')}
              </>
            ) : (
              t('continue')
            )}
          </Button>
        </IconBackActionsRow>
        {!isLocked && guests.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={!interactionEnabled || isSaving || isLoading}
            onClick={() => setSkipConfirmOpen(true)}
          >
            {t('skip')}
          </Button>
        ) : null}
        {bottomAccessory}
      </div>

      <EntryStampHelpSheet
        open={stampHelpOpen}
        onOpenChange={setStampHelpOpen}
        imageUrl={stampHelpImageUrl}
      />

      <BottomSheet open={skipConfirmOpen} onOpenChange={setSkipConfirmOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{t('skipConfirm.title')}</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody className="pb-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('skipConfirm.body')}
            </p>
          </BottomSheetBody>
          <BottomSheetFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setSkipConfirmOpen(false)}
            >
              {t('skipConfirm.cancel')}
            </Button>
            <Button type="button" className="w-full" onClick={handleSkipConfirm}>
              {t('skipConfirm.confirm')}
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}
