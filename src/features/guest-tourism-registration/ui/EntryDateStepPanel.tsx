'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Alert, AlertDescription, Button, IconBackActionsRow } from '@/shared/ui';
import { listTourismGuestsForSessionAction } from '../actions/listTourismGuestsForSessionAction';
import { saveGuestEntryStampDatesAction } from '../actions/saveGuestEntryStampDateAction';
import {
  ArrivalDatesFields,
  buildArrivalDatesPayload,
  resolveInitialArrivalMode,
  resolveInitialPerGuestDates,
  resolveInitialSameDayDate,
  type ArrivalDatesGuestDraft,
  type ArrivalDatesMode,
} from './ArrivalDatesFields';

export type EntryDateNavigationMode = 'standalone' | 'wizard';

type EntryDateStepPanelProps = {
  tenantSlug: string;
  entryDateComplete?: boolean;
  onComplete: (savedEntryStampDate: string | null) => void;
  interactionEnabled?: boolean;
  onBack?: () => void;
  navigationMode?: EntryDateNavigationMode;
  showIntroHeading?: boolean;
};

export function EntryDateStepPanel({
  tenantSlug,
  entryDateComplete = false,
  onComplete,
  interactionEnabled = true,
  onBack,
  showIntroHeading = true,
}: EntryDateStepPanelProps) {
  const t = useTranslations('pages.staySetup.entryDate');
  const [guests, setGuests] = useState<ArrivalDatesGuestDraft[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ArrivalDatesMode>('same');
  const [sameDayDate, setSameDayDate] = useState('');
  const [perGuestDates, setPerGuestDates] = useState<Record<string, string>>({});
  const [dateError, setDateError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const isLocked = entryDateComplete && guests.length > 0;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
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

      const nextGuests: ArrivalDatesGuestDraft[] = result.guests.map((guest) => ({
        id: guest.id,
        label: `${guest.firstName} ${guest.lastName}`.trim(),
        entryStampDate: guest.entryStampDate,
      }));
      setGuests(nextGuests);
      setMode(resolveInitialArrivalMode(nextGuests));
      setSameDayDate(resolveInitialSameDayDate(nextGuests));
      setPerGuestDates(resolveInitialPerGuestDates(nextGuests));
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, t]);

  const handleSave = useCallback(() => {
    if (!interactionEnabled || isLocked) {
      return;
    }

    setSaveError(null);
    setDateError(null);

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

    startSaveTransition(async () => {
      const result = await saveGuestEntryStampDatesAction(tenantSlug, built.payload);
      if (!result.ok) {
        if (result.error === 'invalid_date') {
          setDateError(t('errors.invalidDate'));
        } else {
          setSaveError(t('errors.generic'));
        }
        return;
      }
      onComplete(result.entryStampDate);
    });
  }, [
    guests,
    interactionEnabled,
    isLocked,
    mode,
    onComplete,
    perGuestDates,
    sameDayDate,
    t,
    tenantSlug,
  ]);

  const handleContinueWhenLocked = useCallback(() => {
    onComplete(resolveInitialSameDayDate(guests) || null);
  }, [guests, onComplete]);

  const showFooter = true;
  const panelTopPadding = showIntroHeading ? 'pt-2' : 'pt-0';

  return (
    <div className={cn('flex min-h-full flex-col', panelTopPadding)}>
      <div className="space-y-6">
        {showIntroHeading ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : guests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('emptyGuests')}</p>
        ) : (
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
        )}

        {saveError ? (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {showFooter ? (
        <IconBackActionsRow className="mt-auto pt-6" onBack={onBack}>
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
      ) : null}
    </div>
  );
}
