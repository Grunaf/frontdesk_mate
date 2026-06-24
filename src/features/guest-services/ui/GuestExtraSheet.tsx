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
  const priceLine = extra.priceLabel
    ? t('priceLabel', { price: extra.priceLabel })
    : t('priceAskReception');
  const isOps = extra.kind === 'ops';
  const partnerCtaCount =
    Number(Boolean(waEnabled && extra.whatsappEnabled && whatsappHref)) +
    Number(Boolean(extra.externalUrl));
  const sheetSize = isOps || partnerCtaCount <= 1 ? 'small' : 'compact';

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={sheetSize}>
        <BottomSheetHeader>
          <BottomSheetTitle>{t(`${key}.title`)}</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody className="space-y-3">
          <p className="text-sm text-muted-foreground">{priceLine}</p>
          {extra.scheduleLabel ? (
            <p className="text-sm text-muted-foreground">
              {t('scheduleLabel', { schedule: extra.scheduleLabel })}
            </p>
          ) : null}
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {t(`${key}.description`)}
          </p>
        </BottomSheetBody>
        <BottomSheetFooter className="gap-2">
          {isOps ? (
            <>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  trackGuestExtraEvent('extras_cta_reception', { presetId: extra.presetId });
                  onOpenChange(false);
                }}
              >
                {t('receptionButton')}
              </Button>
              {waEnabled && extra.whatsappEnabled && whatsappHref ? (
                <ExternalServiceButton
                  service="whatsapp"
                  href={whatsappHref}
                  className="w-full"
                  onClick={() =>
                    trackGuestExtraEvent('extras_cta_whatsapp', { presetId: extra.presetId })
                  }
                >
                  {t(`${key}.whatsappButton`)}
                </ExternalServiceButton>
              ) : null}
            </>
          ) : (
            <>
              {waEnabled && extra.whatsappEnabled && whatsappHref ? (
                <ExternalServiceButton
                  service="whatsapp"
                  href={whatsappHref}
                  className="w-full"
                  onClick={() =>
                    trackGuestExtraEvent('extras_cta_whatsapp', { presetId: extra.presetId })
                  }
                >
                  {t(`${key}.whatsappButton`)}
                </ExternalServiceButton>
              ) : null}
              {extra.externalUrl ? (
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
            </>
          )}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
