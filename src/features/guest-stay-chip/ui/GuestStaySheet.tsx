'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { GuestStayPlan } from '@/entities/tenant';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { formatBedLocationLine } from '@/features/find-your-bed/lib/formatBedLocation';
import { useStaySetupBedMapStep } from '@/features/find-your-bed/ui/FindYourBedCard';
import { resolveGuestStaySetupPath } from '@/features/guest-check-in/lib/resolveGuestStaySetupPath';
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
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
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
}

export function GuestStaySheet({
  open,
  onOpenChange,
  stayId,
  guestName,
  plan,
  checkInAt,
  checkOutAt,
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
  const [copied, setCopied] = useState(false);
  const [tourismSummary, setTourismSummary] = useState<GuestStayTourismSummaryState | null>(null);

  const dateRange = formatGuestStayDateRange(checkInAt, checkOutAt, locale);
  const stayRef = formatStayReference(stayId);
  const trimmedGuestName = guestName?.trim() || null;
  const staySetupBedMapStep = useStaySetupBedMapStep();
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);

  const settlementPath = resolveGuestStaySetupPath({
    locale: routeLocale,
    step: staySetupBedMapStep,
    tourismRequired: tourismRegistrationRequired,
    completion: {
      tourismRequired: tourismRegistrationRequired,
      tourismComplete: tourismSummary?.kind === 'complete',
      contactComplete: false,
    },
  });

  const registerPath = resolveGuestStaySetupPath({
    locale: routeLocale,
    step: 'register',
    tourismRequired: tourismRegistrationRequired,
    completion: {
      tourismRequired: tourismRegistrationRequired,
      tourismComplete: false,
      contactComplete: false,
    },
  });

  useEffect(() => {
    if (!open || !tourismRegistrationRequired || !slug) {
      setTourismSummary(null);
      return;
    }

    let cancelled = false;
    setTourismSummary({ kind: 'loading' });

    void listTourismGuestsForSessionAction(slug).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setTourismSummary(null);
        return;
      }

      const guestCount = result.guests.length;
      if (result.complete) {
        setTourismSummary({ kind: 'complete', guestCount });
        return;
      }
      if (guestCount === 0) {
        setTourismSummary({ kind: 'not_started' });
        return;
      }
      setTourismSummary({ kind: 'in_progress', guestCount });
    });

    return () => {
      cancelled = true;
    };
  }, [open, slug, tourismRegistrationRequired]);

  const tourismCompleteForStay =
    !tourismRegistrationRequired || tourismSummary?.kind === 'complete';
  const bedLocationLocked = tourismRegistrationRequired && !tourismCompleteForStay;

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
      bedLine: bedLocationLocked ? '—' : bedLine || '—',
      dateRange,
      stayRef,
      guestName: trimmedGuestName,
      compose: (key, values) => t(key, values),
    });
  }, [bedLine, bedLocationLocked, dateRange, name, stayRef, t, trimmedGuestName]);

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
            locked={bedLocationLocked}
            navigatePath={bedLocationLocked ? registerPath : settlementPath}
          />

          {tourismRegistrationRequired && tourismSummary ? (
            <GuestStayTourismSummaryCard state={tourismSummary} registerPath={registerPath} />
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
