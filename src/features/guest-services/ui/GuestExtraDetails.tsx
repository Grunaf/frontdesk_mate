'use client';

import { useMemo } from 'react';
import {
  buildGuestExtraWhatsappMessage,
  trackGuestExtraEvent,
  type ResolvedGuestExtra,
} from '@/entities/guest-extra';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { createWhatsappLink } from '@/shared/lib';
import { Button, ExternalServiceButton } from '@/shared/ui';
import { formatGuestExtraPriceLine } from '../lib/formatGuestExtraPriceLine';
import { guestExtraPresetI18nKey } from '../lib/guestExtraI18n';

export type GuestExtraDetailsModel = {
  presetId: ResolvedGuestExtra['presetId'];
  title: string;
  priceLine: string;
  scheduleLabel: string | null;
  description: string;
  availabilityHint: string | null;
  opsReceptionHint: string | null;
  showWhatsappCta: boolean;
  whatsappHref: string | null;
  whatsappButtonLabel: string;
  showExternalLink: boolean;
  externalUrl: string | null;
  externalLinkLabel: string;
  hasActions: boolean;
  /** Prefer `small` when ops or ≤1 partner CTA; else `compact`. */
  preferredSheetSize: 'small' | 'compact';
};

type UseGuestExtraDetailsInput = {
  extra: ResolvedGuestExtra | null;
  bedLabel: string;
  stayRef: string | null;
};

export function useGuestExtraDetails({
  extra,
  bedLabel,
  stayRef,
}: UseGuestExtraDetailsInput): GuestExtraDetailsModel | null {
  const { name, settings } = useTenant();
  const hostel = useHostelConfig();
  const t = useTranslations('components.guestExtras');

  const whatsappPhone = hostel.reception.whatsapp.raw;
  const waEnabled = hostel.reception.whatsappEnabled && Boolean(whatsappPhone);

  const whatsappHref = useMemo(() => {
    if (!extra || !waEnabled) {
      return null;
    }

    const message = buildGuestExtraWhatsappMessage({
      presetId: extra.presetId,
      hostelName: name,
      bedLabel,
      stayRef,
      checkoutTime: settings.checkOutTime,
      composeMessage: (key, values) => t(key, values),
    });

    return createWhatsappLink(whatsappPhone!, message);
  }, [bedLabel, extra, name, settings.checkOutTime, stayRef, t, waEnabled, whatsappPhone]);

  return useMemo(() => {
    if (!extra) {
      return null;
    }

    const key = guestExtraPresetI18nKey(extra.presetId);
    const priceLine = formatGuestExtraPriceLine((k, values) => t(k, values), extra.priceLabel);
    const isOps = extra.kind === 'ops';
    const showWhatsappCta = Boolean(waEnabled && extra.whatsappEnabled && whatsappHref);
    const showOpsReceptionHint = isOps && !showWhatsappCta;
    const showExternalLink = !isOps && Boolean(extra.externalUrl);
    const partnerCtaCount = Number(showWhatsappCta) + Number(showExternalLink);
    const hasActions = isOps ? showWhatsappCta : showWhatsappCta || showExternalLink;

    return {
      presetId: extra.presetId,
      title: t(`${key}.title`),
      priceLine,
      scheduleLabel: extra.scheduleLabel?.trim()
        ? t('scheduleLabel', { schedule: extra.scheduleLabel })
        : null,
      description: t(`${key}.description`),
      availabilityHint:
        extra.presetId === 'late_checkout' ? t(`${key}.availabilityHint`) : null,
      opsReceptionHint: showOpsReceptionHint ? t('opsReceptionHint') : null,
      showWhatsappCta,
      whatsappHref,
      whatsappButtonLabel: t(`${key}.whatsappButton`),
      showExternalLink,
      externalUrl: extra.externalUrl?.trim() || null,
      externalLinkLabel: t('externalLinkButton'),
      hasActions,
      preferredSheetSize: isOps || partnerCtaCount <= 1 ? 'small' : 'compact',
    };
  }, [extra, t, waEnabled, whatsappHref]);
}

export function trackGuestExtraDetailsOpen(presetId: ResolvedGuestExtra['presetId']): void {
  trackGuestExtraEvent('extras_sheet_open', { presetId });
}

export function GuestExtraDetailsBody({ details }: { details: GuestExtraDetailsModel }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{details.priceLine}</p>
      {details.scheduleLabel ? (
        <p className="text-sm text-muted-foreground">{details.scheduleLabel}</p>
      ) : null}
      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {details.description}
      </p>
      {details.availabilityHint ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{details.availabilityHint}</p>
      ) : null}
      {details.opsReceptionHint ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{details.opsReceptionHint}</p>
      ) : null}
    </div>
  );
}

export function GuestExtraDetailsActions({ details }: { details: GuestExtraDetailsModel }) {
  if (!details.hasActions) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {details.showWhatsappCta && details.whatsappHref ? (
        <ExternalServiceButton
          service="whatsapp"
          href={details.whatsappHref}
          className="w-full"
          onClick={() =>
            trackGuestExtraEvent('extras_cta_whatsapp', { presetId: details.presetId })
          }
        >
          {details.whatsappButtonLabel}
        </ExternalServiceButton>
      ) : null}
      {details.showExternalLink && details.externalUrl ? (
        <Button asChild variant="outline" className="w-full">
          <a
            href={details.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGuestExtraEvent('extras_cta_link', { presetId: details.presetId })}
          >
            {details.externalLinkLabel}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
