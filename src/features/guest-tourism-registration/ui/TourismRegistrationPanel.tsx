'use client';

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useGuestSession } from '@/features/guest-check-in';
import { resolveTourismRegistrationProfile, useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  Alert,
  AlertDescription,
  Button,
  FieldLabelHelp,
  IconBackActionsRow,
} from '@/shared/ui';
import { completeTourismRegistrationAction } from '../actions/completeTourismRegistrationAction';
import {
  listTourismGuestsForSessionAction,
  type TourismGuestListItem,
} from '../actions/listTourismGuestsForSessionAction';
import { hasAdultGuestOnCheckIn } from '../lib/hasAdultGuestOnCheckIn';
import {
  clearTourismGuestDraft,
  readTourismGuestDraft,
  writeTourismGuestDraft,
  type TourismGuestDraft,
  type TourismGuestFormValues,
} from '../lib/tourismGuestDraftStorage';
import { AddTourismGuestSheet } from './AddTourismGuestSheet';
import { FinishTourismGuestDraftSheet } from './FinishTourismGuestDraftSheet';
import { TourismGuestList } from './TourismGuestList';
import { TourismRegistrationPanelSkeleton } from './TourismRegistrationPanelSkeleton';
import { TourismRegistrationPrivacyPolicySheet } from './TourismRegistrationPrivacyPolicySheet';
import { TourismRegistrationPrivacySheet } from './TourismRegistrationPrivacySheet';

type TourismGuestsRegistrationPanelProps = {
  onComplete: () => void;
  /** When false, show preview UI without fetching or submitting (stay-setup before check-in). */
  interactionEnabled?: boolean;
  navigationMode?: 'standalone' | 'wizard';
  showIntroHeading?: boolean;
  /** SSR guest list — skips initial client fetch / skeleton. */
  initialGuests?: TourismGuestListItem[];
  initialRegistrationComplete?: boolean;
  /** Notify parent when the live guest list changes (registration accordion shares with Entry Date). */
  onGuestsChange?: (guests: TourismGuestListItem[]) => void;
  /** Standalone only: rendered under primary in the pinned bottom chrome (e.g. next accordion). */
  bottomAccessory?: ReactNode;
  className?: string;
};

export function TourismGuestsRegistrationPanel({
  onComplete,
  interactionEnabled = true,
  showIntroHeading = true,
  initialGuests,
  initialRegistrationComplete = false,
  onGuestsChange,
  bottomAccessory,
  className,
}: TourismGuestsRegistrationPanelProps) {
  const t = useTranslations('pages.staySetup.register');
  const { slug: tenantSlug, settings } = useTenant();
  const { session } = useGuestSession();
  const profile = resolveTourismRegistrationProfile(settings);
  const countryVars = { country: profile?.countryNameKey ?? '' };

  const stayId = session?.stayId ?? '';
  const checkInDate = session?.checkInDate ?? '';
  const hasSsrGuests = initialGuests !== undefined;

  const [guests, setGuests] = useState<TourismGuestListItem[]>(() => initialGuests ?? []);
  const [registrationComplete, setRegistrationComplete] = useState(
    () => initialRegistrationComplete
  );
  const [privacyAccepted, setPrivacyAccepted] = useState(
    () => initialRegistrationComplete
  );
  const [privacyWhySheetOpen, setPrivacyWhySheetOpen] = useState(false);
  const [privacyPolicySheetOpen, setPrivacyPolicySheetOpen] = useState(false);
  const [addGuestSheetOpen, setAddGuestSheetOpen] = useState(false);
  const [finishDraftSheetOpen, setFinishDraftSheetOpen] = useState(false);
  const [draft, setDraft] = useState<TourismGuestDraft | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(
    () => interactionEnabled && !hasSsrGuests
  );
  const [isGuestUploadPending, setIsGuestUploadPending] = useState(false);
  const [isCompleting, startCompleteTransition] = useTransition();

  // Accordion middle scrolls; panel height follows content (no flex gap before next labels).
  const panelTopPadding = showIntroHeading ? 'pt-5' : 'pt-0';

  const hasAdult = useMemo(
    () => hasAdultGuestOnCheckIn(guests, checkInDate),
    [guests, checkInDate]
  );

  useEffect(() => {
    if (!stayId) {
      setDraft(null);
      return;
    }
    setDraft(readTourismGuestDraft(stayId));
  }, [stayId]);

  const refreshGuests = useCallback(async () => {
    const result = await listTourismGuestsForSessionAction(tenantSlug);
    if (!result.ok) {
      setLoadError(
        result.error === 'unauthorized' ? t('errors.unauthorized') : t('errors.generic')
      );
      return false;
    }

    setGuests(result.guests);
    onGuestsChange?.(result.guests);
    setRegistrationComplete(result.complete);
    if (result.complete) {
      setPrivacyAccepted(true);
    }
    setLoadError(null);
    return true;
  }, [tenantSlug, t, onGuestsChange]);

  useEffect(() => {
    if (!interactionEnabled) {
      setIsLoadingList(false);
      setLoadError(null);
      return;
    }

    // SSR already hydrated the list — skip first-paint skeleton/fetch.
    if (hasSsrGuests) {
      setIsLoadingList(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoadingList(true);
      const result = await listTourismGuestsForSessionAction(tenantSlug);
      if (cancelled) return;

      if (!result.ok) {
        setLoadError(
          result.error === 'unauthorized' ? t('errors.unauthorized') : t('errors.generic')
        );
        setIsLoadingList(false);
        return;
      }

      setGuests(result.guests);
      onGuestsChange?.(result.guests);
      setRegistrationComplete(result.complete);
      if (result.complete) {
        setPrivacyAccepted(true);
      }
      setIsLoadingList(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, t, interactionEnabled, hasSsrGuests, onGuestsChange]);

  const handleGuestAdded = useCallback(async () => {
    setIsGuestUploadPending(true);
    try {
      await refreshGuests();
    } finally {
      setIsGuestUploadPending(false);
    }
  }, [refreshGuests]);

  const handleDraftSave = useCallback(
    (values: TourismGuestFormValues) => {
      if (!stayId) return;
      const next: TourismGuestDraft = {
        id: draft?.id ?? crypto.randomUUID(),
        values,
        updatedAt: new Date().toISOString(),
      };
      setDraft(next);
      writeTourismGuestDraft(stayId, next);
      setEditingDraft(false);
    },
    [draft?.id, stayId]
  );

  const handleDraftClear = useCallback(() => {
    if (stayId) {
      clearTourismGuestDraft(stayId);
    }
    setDraft(null);
    setEditingDraft(false);
  }, [stayId]);

  const openDraftForm = () => {
    setEditingDraft(true);
    setAddGuestSheetOpen(true);
  };

  const handleAddGuestClick = () => {
    if (!interactionEnabled || isGuestUploadPending) return;
    if (draft) {
      setFinishDraftSheetOpen(true);
      return;
    }
    setEditingDraft(false);
    setAddGuestSheetOpen(true);
  };

  const completeDisabled =
    !interactionEnabled ||
    registrationComplete ||
    guests.length < 1 ||
    !hasAdult ||
    Boolean(draft) ||
    !privacyAccepted ||
    isGuestUploadPending ||
    isCompleting ||
    isLoadingList;

  const resolveCompleteError = (code: string): string => {
    switch (code) {
      case 'no_guests':
        return t('errors.noGuests');
      case 'unauthorized':
        return t('errors.unauthorized');
      case 'feature_disabled':
        return t('errors.featureDisabled');
      case 'db_unavailable':
        return t('errors.dbUnavailable');
      default:
        return t('errors.generic');
    }
  };

  const handleComplete = () => {
    if (!interactionEnabled) {
      return;
    }

    setCompleteError(null);

    if (draft) {
      setCompleteError(t('errors.finishDraftFirst'));
      return;
    }
    if (!hasAdult) {
      setCompleteError(t('errors.needAdultGuest'));
      return;
    }

    startCompleteTransition(async () => {
      const result = await completeTourismRegistrationAction(tenantSlug);
      if (!result.ok) {
        setCompleteError(resolveCompleteError(result.error));
        return;
      }

      setRegistrationComplete(true);
      setPrivacyAccepted(true);
      onComplete();
    });
  };

  const privacyCheckbox = (locked: boolean) => {
    const inputDisabled = locked || isCompleting || !interactionEnabled;
    return (
      <div
        className={cn(
          'flex items-start gap-3 text-sm leading-relaxed text-foreground',
          inputDisabled && 'opacity-60'
        )}
      >
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 rounded border border-input accent-primary disabled:cursor-not-allowed"
          checked={locked || privacyAccepted}
          onChange={(e) => {
            if (locked) return;
            setPrivacyAccepted(e.target.checked);
          }}
          disabled={inputDisabled}
          aria-disabled={inputDisabled}
        />
        <span>
          {t('finish.agreePrefix')}{' '}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-2"
            onClick={() => setPrivacyPolicySheetOpen(true)}
          >
            {t('privacyPolicy.linkLabel')}
          </button>
        </span>
      </div>
    );
  };

  const privacySheets = (
    <>
      <TourismRegistrationPrivacySheet
        open={privacyWhySheetOpen}
        onOpenChange={setPrivacyWhySheetOpen}
        onOpenFullPolicy={() => setPrivacyPolicySheetOpen(true)}
      />
      <TourismRegistrationPrivacyPolicySheet
        open={privacyPolicySheetOpen}
        onOpenChange={setPrivacyPolicySheetOpen}
      />
    </>
  );

  const submitButton = (
    <Button size="lg" className="w-full" disabled={completeDisabled} onClick={handleComplete}>
      {isCompleting ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('finish.submitting')}
        </>
      ) : (
        t('finish.submit')
      )}
    </Button>
  );

  const introBlock = (
    <div className="space-y-2">
      <div className="flex items-start gap-1.5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('intro.description', countryVars)}
        </p>
        <FieldLabelHelp
          fieldLabel={t('privacy.title')}
          onPress={() => setPrivacyWhySheetOpen(true)}
        />
      </div>
    </div>
  );

  if (interactionEnabled && isLoadingList) {
    return <TourismRegistrationPanelSkeleton loadingLabel={t('loading')} />;
  }

  if (interactionEnabled && loadError) {
    return (
      <div className={panelTopPadding}>
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (registrationComplete) {
    return (
      <div className={cn('flex flex-col', panelTopPadding, className)}>
        <div className="space-y-6">
          {showIntroHeading ? (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">{t('complete.summaryTitle')}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('intro.description', countryVars)}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('intro.description', countryVars)}
            </p>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{t('guestList.heading')}</h3>
            <TourismGuestList guests={guests} />
          </div>
        </div>

        {privacySheets}

        <div className="shrink-0 space-y-4 pt-4 pb-2">
          {privacyCheckbox(true)}
          {bottomAccessory}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', panelTopPadding, className)}>
      <div className="space-y-6">
        {introBlock}

        {privacySheets}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('guestList.heading')}</h3>
          <TourismGuestList
            guests={guests}
            draft={draft}
            onDraftClick={interactionEnabled ? openDraftForm : undefined}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className={cn('w-full', draft && 'opacity-60')}
          disabled={!interactionEnabled || isGuestUploadPending}
          onClick={handleAddGuestClick}
        >
          {t('addGuest.heading')}
        </Button>

        <AddTourismGuestSheet
          open={addGuestSheetOpen}
          onOpenChange={(open) => {
            setAddGuestSheetOpen(open);
            if (!open) {
              setEditingDraft(false);
            }
          }}
          tenantSlug={tenantSlug}
          checkInDate={checkInDate}
          showUnderageAloneWarning={!hasAdult}
          initialValues={editingDraft ? draft?.values : undefined}
          formInstanceKey={editingDraft && draft ? `draft-${draft.id}` : 'create'}
          disabled={!interactionEnabled || isGuestUploadPending}
          onUploadPendingChange={setIsGuestUploadPending}
          onGuestAdded={handleGuestAdded}
          onDraftSave={handleDraftSave}
          onDraftClear={handleDraftClear}
        />

        <FinishTourismGuestDraftSheet
          open={finishDraftSheetOpen}
          onOpenChange={setFinishDraftSheetOpen}
          onContinue={openDraftForm}
        />

        <div className="space-y-4">
          {privacyCheckbox(false)}
          {guests.length > 0 && !hasAdult ? (
            <p className="text-sm text-muted-foreground">{t('errors.needAdultGuest')}</p>
          ) : null}
          {completeError ? (
            <Alert variant="destructive">
              <AlertDescription>{completeError}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 space-y-4 pt-4 pb-2">
        <IconBackActionsRow>{submitButton}</IconBackActionsRow>
        {bottomAccessory}
      </div>
    </div>
  );
}

/** @deprecated Use TourismGuestsRegistrationPanel in stay-setup flow. */
export function TourismRegistrationPanel({ onComplete }: TourismGuestsRegistrationPanelProps) {
  return <TourismGuestsRegistrationPanel onComplete={onComplete} />;
}
