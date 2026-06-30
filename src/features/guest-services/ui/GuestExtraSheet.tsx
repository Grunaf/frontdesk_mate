'use client';

import { useEffect, useMemo } from 'react';
import {
  buildGuestExtraWhatsappMessage,
  trackGuestExtraEvent,
  type ResolvedGuestExtra,
} from '@/entities/guest-extra';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { createWhatsappLink } from '@/shared/lib';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  ExternalServiceButton,
} from '@/shared/ui';
import { formatGuestExtraPriceLine } from '../lib/formatGuestExtraPriceLine';
import { guestExtraPresetI18nKey } from '../lib/guestExtraI18n';

interface GuestExtraSheetProps {
  extra: ResolvedGuestExtra | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bedLabel: string;
  stayRef: string | null;
}

export function GuestExtraSheet({
  extra,
  open,
  onOpenChange,
  bedLabel,
  stayRef,
}: GuestExtraSheetProps) {
  const { name, settings } = useTenant();
  const hostel = useHostelConfig();
  const t = useTranslations('components.guestExtras');

  const whatsappPhone = hostel.reception.whatsapp.raw;
  const waEnabled = hostel.reception.whatsappEnabled && Boolean(whatsappPhone);

  useEffect(() => {
    if (open && extra) {
      trackGuestExtraEvent('extras_sheet_open', { presetId: extra.presetId });
    }
  }, [open, extra]);

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

  if (!extra) {
    return null;
  }

  const key = guestExtraPresetI18nKey(extra.presetId);
  const priceLine = formatGuestExtraPriceLine((key, values) => t(key, values), extra.priceLabel);
  const isOps = extra.kind === 'ops';
  const showWhatsappCta = Boolean(waEnabled && extra.whatsappEnabled && whatsappHref);
  const showOpsReceptionHint = isOps && !showWhatsappCta;
  const partnerCtaCount = Number(showWhatsappCta) + Number(Boolean(extra.externalUrl));
  const sheetSize = isOps || partnerCtaCount <= 1 ? 'small' : 'compact';
  const hasFooter = isOps ? showWhatsappCta : showWhatsappCta || Boolean(extra.externalUrl);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={sheetSize}>
        <BottomSheetHeader>
          <BottomSheetTitle>{t(`${key}.title`)}</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody className="space-y-3">
          <p className="text-muted-foreground text-sm">{priceLine}</p>
          {extra.scheduleLabel ? (
            <p className="text-muted-foreground text-sm">
              {t('scheduleLabel', { schedule: extra.scheduleLabel })}
            </p>
          ) : null}
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {t(`${key}.description`)}
          </p>
          {extra.presetId === 'late_checkout' ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t(`${key}.availabilityHint`)}
            </p>
          ) : null}
          {showOpsReceptionHint ? (
            <p className="text-muted-foreground text-sm leading-relaxed">{t('opsReceptionHint')}</p>
          ) : null}
        </BottomSheetBody>
        {hasFooter ? (
          <BottomSheetFooter className="gap-2">
            {showWhatsappCta ? (
              <ExternalServiceButton
                service="whatsapp"
                href={whatsappHref!}
                className="w-full"
                onClick={() =>
                  trackGuestExtraEvent('extras_cta_whatsapp', { presetId: extra.presetId })
                }
              >
                {t(`${key}.whatsappButton`)}
              </ExternalServiceButton>
            ) : null}
            {!isOps && extra.externalUrl ? (
              <Button asChild variant="outline" className="w-full">
                <a
                  href={extra.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackGuestExtraEvent('extras_cta_link', { presetId: extra.presetId })
                  }
                >
                  {t('externalLinkButton')}
                </a>
              </Button>
            ) : null}
          </BottomSheetFooter>
        ) : null}
      </BottomSheetContent>
    </BottomSheet>
  );
}
