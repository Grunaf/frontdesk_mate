'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { GuestStayPlan } from '@/entities/tenant';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { formatBedLocationLine } from '@/features/find-your-bed/lib/formatBedLocation';
import { useStaySetupBedMapStep } from '@/features/find-your-bed/ui/FindYourBedCard';
import { resolveGuestStaySetupPath } from '@/features/guest-check-in/lib/resolveGuestStaySetupPath';
import { useStaySetupStatus } from '@/features/guest-stay-contact';
import { listTourismGuestsForSessionAction } from '@/features/guest-tourism-registration';
import { ReceptionContactActions, useReceptionContactLabels } from '@/features/reception-contact';
import { useTranslations, useLocale } from '@/shared/i18n';
import {
  BottomSheet,
  BottomSheetBody,
  BOTTOM_SHEET_SIZES,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/shared/ui';
import { useGuestIssueReport } from '@/features/guest-issue-report';
import { buildReceptionCopyText } from '../lib/buildReceptionCopyText';
import {
  buildExtendStayWhatsappMessage,
  resolveGuestStayBedLabel,
} from '../lib/buildExtendStayWhatsappMessage';
import { formatGuestStayDateRange } from '../lib/formatGuestStayDates';
import { resolveTourismSummaryFromStaySetupStatus } from '../lib/resolveTourismSummaryFromStaySetupStatus';
import { formatStayReference, isStayCheckInStarted } from '@/entities/guest-stay';
import { GuestStayBedLocationCard } from './GuestStayBedLocationCard';
import { GuestStayReceptionCard } from './GuestStayReceptionCard';
import {
  GuestStayTourismSummaryCard,
  type GuestStayTourismSummaryState,
} from './GuestStayTourismSummaryCard';

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
  const [copied, setCopied] = useState(false);
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

  const hideBedFromGuest = !checkInStarted || bedLocationLocked;

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

  const bedLine = useMemo(
    () =>
      plan.bedId
        ? formatBedLocationLine(
            (key, values) => tBed(key, values as Record<string, string | number> | undefined),
            plan,
            { omitFloor: true }
          )
        : '',
    [plan, tBed]
  );

  const receptionCopyText = useMemo(() => {
    if (!dateRange) {
      return null;
    }

    return buildReceptionCopyText({
      hostelName: name,
      bedLine: hideBedFromGuest ? '—' : bedLine || '—',
      dateRange,
      stayRef,
      guestName: trimmedGuestName,
      compose: (key, values) => t(key, values),
    });
  }, [bedLine, hideBedFromGuest, dateRange, name, stayRef, t, trimmedGuestName]);

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

  const handleCopyForReception = async () => {
    if (!receptionCopyText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(receptionCopyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle className="pr-8 text-base leading-snug">{t('sheetTitle')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-4 pb-4">
          {dateRange ? (
            <GuestStayReceptionCard
              dateRange={dateRange}
              stayRef={stayRef}
              guestName={trimmedGuestName}
              receptionCopyText={receptionCopyText}
              copied={copied}
              onCopy={handleCopyForReception}
            />
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

          <div className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t('extendStayHeading')}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('extendStayNotice')}</p>
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
        </BottomSheetBody>

        {extendContact ? (
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
