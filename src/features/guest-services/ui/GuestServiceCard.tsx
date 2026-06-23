'use client';

import { useMemo } from 'react';
import { formatStayReference } from '@/entities/guest-stay';
import { resolveGuestStayPlan, useHostelConfig, useTenant } from '@/entities/tenant';
import { resolveGuestStayBedLabel } from '@/features/guest-stay-chip/lib/buildExtendStayWhatsappMessage';
import { useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { useTranslations } from '@/shared/i18n';
import { createWhatsappLink } from '@/shared/lib';
import { ExternalServiceButton } from '@/shared/ui';
import { buildServiceWhatsappMessage } from '../lib/buildServiceWhatsappMessage';
import type { GuestServiceId, ResolvedGuestService } from '../lib/resolveGuestServices';

function serviceI18nKey(id: GuestServiceId): 'laundry' | 'lateCheckout' {
  return id === 'late_checkout' ? 'lateCheckout' : id;
}

interface GuestServiceCardProps {
  service: ResolvedGuestService;
  whatsappPhone: string;
  bedLabel: string;
  stayRef: string | null;
  checkoutTime?: string;
}

export function GuestServiceCard({
  service,
  whatsappPhone,
  bedLabel,
  stayRef,
  checkoutTime,
}: GuestServiceCardProps) {
  const { name } = useTenant();
  const t = useTranslations('components.guestServices');

  const priceLine = service.priceLabel
    ? t('priceLabel', { price: service.priceLabel })
    : t('priceAskReception');

  const whatsappHref = useMemo(() => {
    const message = buildServiceWhatsappMessage({
      serviceId: service.id,
      hostelName: name,
      bedLabel,
      stayRef,
      checkoutTime,
      composeMessage: (key, values) => t(key, values),
    });

    return createWhatsappLink(whatsappPhone, message);
  }, [bedLabel, checkoutTime, name, service.id, stayRef, t, whatsappPhone]);

  return (
    <article className="rounded-xl border bg-muted/30 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{t(`${serviceI18nKey(service.id)}.title`)}</p>
        <p className="text-xs text-muted-foreground">{priceLine}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(`${serviceI18nKey(service.id)}.description`)}
        </p>
      </div>
      <ExternalServiceButton service="whatsapp" href={whatsappHref} className="mt-3 w-full">
        {t(`${serviceI18nKey(service.id)}.whatsappButton`)}
      </ExternalServiceButton>
    </article>
  );
}
