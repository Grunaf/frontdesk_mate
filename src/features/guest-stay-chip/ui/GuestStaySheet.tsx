'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { GuestStayPlan } from '@/entities/tenant';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import { resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { formatBedLocationLine } from '@/features/find-your-bed/lib/formatBedLocation';
import { FindYourBedSummary } from '@/features/find-your-bed/ui/FindYourBedSummary';
import { useStaySetupBedMapStep } from '@/features/find-your-bed/ui/FindYourBedCard';
import { resolveGuestStaySetupPath } from '@/features/guest-check-in/lib/resolveGuestStaySetupPath';
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
import { BedDouble, Check, Copy } from 'lucide-react';
import { useGuestIssueReport } from '@/features/guest-issue-report';
import { buildReceptionCopyText } from '../lib/buildReceptionCopyText';
import {
  buildExtendStayWhatsappMessage,
  resolveGuestStayBedLabel,
} from '../lib/buildExtendStayWhatsappMessage';
import { formatGuestStayDateRange } from '../lib/formatGuestStayDates';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';

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
      tourismComplete: false,
      contactComplete: false,
    },
  });

  const bedLine = useMemo(
    () =>
      plan.bedId
        ? formatBedLocationLine(
            (key, values) => tBed(key, values as Record<string, string | number> | undefined),
            plan
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
      bedLine: bedLine || '—',
      dateRange,
      stayRef,
      guestName: trimmedGuestName,
      compose: (key, values) => t(key, values),
    });
  }, [bedLine, dateRange, name, stayRef, t, trimmedGuestName]);

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
          <div className="flex items-start gap-3 pr-8">
            <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
              <Icon icon={BedDouble} className="h-5 w-5" />
            </div>
            <BottomSheetTitle className="text-base leading-snug">{t('sheetTitle')}</BottomSheetTitle>
          </div>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-4 pb-4">
          {plan.bedId && dateRange ? (
            <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t('receptionHeading')}
                </p>
                {receptionCopyText ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    aria-label={copied ? t('copiedForReception') : t('copyForReception')}
                    onClick={handleCopyForReception}
                  >
                    <Icon icon={copied ? Check : Copy} className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                <FindYourBedSummary plan={plan} variant="breadcrumb" />
                <p className="text-sm font-medium text-foreground">{dateRange}</p>
                {stayRef ? (
                  <p className="font-mono text-sm font-semibold tracking-wide text-foreground">
                    {t('stayRefLabel')} #{stayRef}
                  </p>
                ) : null}
                {trimmedGuestName ? (
                  <p className="text-sm text-muted-foreground">
                    {t('registeredAsLabel')}: {trimmedGuestName}
                  </p>
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">{t('receptionHint')}</p>

              <Link
                href={settlementPath}
                className={cn(
                  'inline-flex min-h-11 max-w-full items-center rounded-md px-0 py-2 font-medium text-primary underline decoration-primary/35 underline-offset-[3px] transition-colors hover:decoration-primary/70'
                )}
              >
                <span className="text-left text-sm leading-snug">{t('showRoomMapLink')}</span>
              </Link>
            </div>
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
