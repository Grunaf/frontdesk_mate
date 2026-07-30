'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { GuestStayPlan } from '@/entities/tenant';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { useStaySetupBedMapStep } from '@/features/find-your-bed/ui/FindYourBedCard';
import { resolveGuestStaySetupPath } from '@/features/guest-check-in/lib/resolveGuestStaySetupPath';
import { useStaySetupStatus } from '@/features/guest-stay-contact';
import { listTourismGuestsForSessionAction } from '@/features/guest-tourism-registration';
import { ReceptionContactActions, useReceptionContactLabels } from '@/features/reception-contact';
import { useTranslations, useLocale } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  BottomSheet,
  BottomSheetBody,
  BOTTOM_SHEET_SIZES,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  Icon,
} from '@/shared/ui';
import { useGuestIssueReport } from '@/features/guest-issue-report';
import { buildReceptionStayDetailUrl } from '../lib/buildReceptionStayDetailUrl';
import {
  buildExtendStayWhatsappMessage,
  resolveGuestStayBedLabel,
} from '../lib/buildExtendStayWhatsappMessage';
import { formatGuestStayDateRange } from '../lib/formatGuestStayDates';
import { resolveTourismSummaryFromStaySetupStatus } from '../lib/resolveTourismSummaryFromStaySetupStatus';
import { formatStayReference, isStayCheckInStarted } from '@/entities/guest-stay';
import { GuestStayBedLocationCard } from './GuestStayBedLocationCard';
import { GuestStayReceptionCard } from './GuestStayReceptionCard';
import { GuestStayReceptionQrPanel } from './GuestStayReceptionQrPanel';
import {
  GuestStayTourismSummaryCard,
  type GuestStayTourismSummaryState,
} from './GuestStayTourismSummaryCard';

type GuestStaySheetStep = 'info' | 'receptionQr';
type SheetSlideFrom = 'left' | 'right';

interface GuestStaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stayId: string;
  guestName: string | null;
  plan: GuestStayPlan;
  checkInAt: string;
  checkOutAt: string;
  checkInDate: string;
  checkOutDate: string;
  /** Hub stay actions (extend / report). Off during settling-in onboarding. */
  showStayActions?: boolean;
}

function sheetStepMotionClass(slideFrom: SheetSlideFrom): string {
  return cn(
    'animate-in fade-in-0 duration-200 motion-reduce:animate-none',
    slideFrom === 'right' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
  );
}

export function GuestStaySheet({
  open,
  onOpenChange,
  stayId,
  guestName,
  plan,
  checkInAt,
  checkOutAt,
  checkInDate,
  checkOutDate,
  showStayActions = true,
}: GuestStaySheetProps) {
  const { name, hostel, slug, settings } = useTenant();
  const locale = useLocale();
  const params = useParams<{ locale: string }>();
  const routeLocale = params.locale ?? locale;
  const t = useTranslations('components.guestStayChip');
  const tBed = useTranslations('components.findYourBed');
  const tIssue = useTranslations('components.guestIssue');
  const receptionLabels = useReceptionContactLabels();
  const { openReportSheet } = useGuestIssueReport();
  const { status: staySetupStatus, statusLoading: staySetupStatusLoading } = useStaySetupStatus();
  const [step, setStep] = useState<GuestStaySheetStep>('info');
  const [slideFrom, setSlideFrom] = useState<SheetSlideFrom>('right');
  const [tourismSummaryFallback, setTourismSummaryFallback] =
    useState<GuestStayTourismSummaryState | null>(null);
  const [tourismSummaryFallbackLoaded, setTourismSummaryFallbackLoaded] = useState(false);

  const dateRange = formatGuestStayDateRange(checkInAt, checkOutAt, locale, {
    checkInDate,
    checkOutDate,
  });
  const stayRef = formatStayReference(stayId);
  const trimmedGuestName = guestName?.trim() || null;
  const staySetupBedMap = useStaySetupBedMapStep(true);
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const isReceptionQrStep = step === 'receptionQr';

  const tourismSummaryFromStatus =
    staySetupStatus && tourismRegistrationRequired
      ? resolveTourismSummaryFromStaySetupStatus(staySetupStatus)
      : null;

  const tourismSummaryForDisplay: GuestStayTourismSummaryState | null = (() => {
    if (!open || !tourismRegistrationRequired) {
      return null;
    }
    if (tourismSummaryFromStatus) {
      return tourismSummaryFromStatus;
    }
    if (staySetupStatusLoading) {
      return { kind: 'loading' };
    }
    if (tourismSummaryFallbackLoaded) {
      return tourismSummaryFallback;
    }
    return { kind: 'loading' };
  })();

  const registrationStatusLoading =
    tourismRegistrationRequired && tourismSummaryForDisplay?.kind === 'loading';

  const tourismCompleteForStay =
    !tourismRegistrationRequired || tourismSummaryForDisplay?.kind === 'complete';
  const bedLocationLocked =
    !registrationStatusLoading && tourismRegistrationRequired && !tourismCompleteForStay;

  const checkInStarted = isStayCheckInStarted({
    checkInAt,
    checkInDate,
    propertyTimeZone: hostel.propertyTimeZone,
    checkInTimeFallback: hostel.checkInTime,
  });
  const checkInTimeLabel = hostel.checkInTime?.trim() || '14:00';

  const bedLocationLockReason =
    registrationStatusLoading || checkInStarted
      ? bedLocationLocked
        ? ('registration' as const)
        : null
      : ('before_check_in' as const);

  const settlementPath = resolveGuestStaySetupPath({
    locale: routeLocale,
    step: staySetupBedMap.step,
    tourismRequired: tourismRegistrationRequired,
    completion: staySetupBedMap.completion,
  });

  const registerPath = resolveGuestStaySetupPath({
    locale: routeLocale,
    step: 'registration',
    tourismRequired: tourismRegistrationRequired,
    completion: staySetupBedMap.completion,
  });

  const bedNavigatePath = registrationStatusLoading
    ? undefined
    : bedLocationLockReason === 'before_check_in'
      ? undefined
      : bedLocationLockReason === 'registration'
        ? registerPath
        : settlementPath;

  const bedNavigateLoading = registrationStatusLoading || staySetupBedMap.statusLoading;

  useEffect(() => {
    if (!open || !tourismRegistrationRequired || !slug) {
      setTourismSummaryFallback(null);
      setTourismSummaryFallbackLoaded(false);
      return;
    }

    // Prefer shared StaySetupStatus (SSR / provider); skip guest-list fetch.
    if (staySetupStatus) {
      setTourismSummaryFallback(null);
      setTourismSummaryFallbackLoaded(false);
      return;
    }

    if (staySetupStatusLoading) {
      return;
    }

    let cancelled = false;
    setTourismSummaryFallback(null);
    setTourismSummaryFallbackLoaded(false);

    void listTourismGuestsForSessionAction(slug).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setTourismSummaryFallback(null);
        setTourismSummaryFallbackLoaded(true);
        return;
      }

      const guestCount = result.guests.length;
      if (result.complete) {
        setTourismSummaryFallback({ kind: 'complete', guestCount });
        setTourismSummaryFallbackLoaded(true);
        return;
      }
      if (guestCount === 0) {
        setTourismSummaryFallback({ kind: 'not_started' });
        setTourismSummaryFallbackLoaded(true);
        return;
      }
      setTourismSummaryFallback({ kind: 'in_progress', guestCount });
      setTourismSummaryFallbackLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, slug, tourismRegistrationRequired, staySetupStatus, staySetupStatusLoading]);

  useEffect(() => {
    if (!open) {
      setStep('info');
      setSlideFrom('right');
    }
  }, [open]);

  const receptionStayDetailUrl = useMemo(
    () => (slug && stayId ? buildReceptionStayDetailUrl(slug, stayId, locale) : ''),
    [locale, slug, stayId]
  );

  const goReceptionQr = useCallback(() => {
    if (!receptionStayDetailUrl) {
      return;
    }
    setSlideFrom('right');
    setStep('receptionQr');
  }, [receptionStayDetailUrl]);

  const goBackToInfo = useCallback(() => {
    setSlideFrom('left');
    setStep('info');
  }, []);

  const extendContact = useMemo(() => {
    const bedLabel = resolveGuestStayBedLabel(plan, (key, values) =>
      tBed(key, values as Record<string, string | number> | undefined)
    );

    const message = buildExtendStayWhatsappMessage({
      hostelName: name,
      bedLabel,
      checkOutAt,
      locale,
      stayRef,
      guestName: trimmedGuestName,
      composeMessage: (key, values) => t(key, values),
    });

    return resolveReceptionContact(hostel, {
      message,
      urgency: 'low',
      translate: receptionLabels.translateHint,
    });
  }, [
    checkOutAt,
    hostel,
    locale,
    name,
    plan,
    receptionLabels.translateHint,
    stayRef,
    t,
    tBed,
    trimmedGuestName,
  ]);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className={cn('px-6 pb-3', isReceptionQrStep && 'pr-12')}>
          {isReceptionQrStep ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-ml-1.5 shrink-0"
                onClick={goBackToInfo}
                aria-label={t('receptionQrBack')}
              >
                <Icon icon={ArrowLeft} className="size-4" />
              </Button>
              <BottomSheetTitle className="min-w-0 flex-1 truncate text-left text-base leading-snug">
                {t('receptionQrTitle')}
              </BottomSheetTitle>
            </div>
          ) : (
            <BottomSheetTitle className="pr-8 text-base leading-snug">
              {t('sheetTitle')}
            </BottomSheetTitle>
          )}
        </BottomSheetHeader>

        <BottomSheetBody className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4">
          <div key={step} className={cn('min-h-0 flex-1', sheetStepMotionClass(slideFrom))}>
            {isReceptionQrStep ? (
              <GuestStayReceptionQrPanel
                active={isReceptionQrStep}
                stayDetailUrl={receptionStayDetailUrl}
              />
            ) : (
              <div className="space-y-4">
                {dateRange ? (
                  <GuestStayReceptionCard
                    dateRange={dateRange}
                    stayRef={stayRef}
                    guestName={trimmedGuestName}
                    canShowQr={Boolean(receptionStayDetailUrl)}
                    onShowQr={goReceptionQr}
                  />
                ) : null}

                {staySetupStatus?.contactPhone || staySetupStatus?.contactEmail ? (
                  <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {t('yourContactHeading')}
                    </p>
                    {staySetupStatus.contactPhone ? (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{t('yourContactPhoneLabel')}</p>
                        <p className="text-sm text-foreground">{staySetupStatus.contactPhone}</p>
                      </div>
                    ) : null}
                    {staySetupStatus.contactEmail ? (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">{t('yourContactEmailLabel')}</p>
                        <p className="text-sm text-foreground">{staySetupStatus.contactEmail}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <GuestStayBedLocationCard
                  plan={plan}
                  lockReason={bedLocationLockReason}
                  checkInTimeLabel={checkInTimeLabel}
                  navigatePath={bedNavigatePath}
                  navigateLoading={bedNavigateLoading}
                />

                {tourismSummaryForDisplay ? (
                  <GuestStayTourismSummaryCard
                    state={tourismSummaryForDisplay}
                    registerPath={registerPath}
                  />
                ) : null}

                {showStayActions ? (
                  <>
                    <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t('extendStayHeading')}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t('extendStayNotice')}
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {tIssue('myStayPrompt')}{' '}
                      <button
                        type="button"
                        className="font-medium text-primary underline decoration-primary/35 underline-offset-[3px] hover:decoration-primary/70"
                        onClick={() => {
                          onOpenChange(false);
                          openReportSheet();
                        }}
                      >
                        {tIssue('myStayLink')}
                      </button>
                    </p>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </BottomSheetBody>

        {!isReceptionQrStep && showStayActions && extendContact ? (
          <BottomSheetFooter className="border-t border-border/60">
            <ReceptionContactActions
              contact={extendContact}
              labels={{ message: receptionLabels.message, call: receptionLabels.call }}
              whatsappVariant="primary"
              callButtonSize="default"
              analyticsContext="extend_stay"
              tenantSlug={slug}
            />
          </BottomSheetFooter>
        ) : null}
      </BottomSheetContent>
    </BottomSheet>
  );
}
