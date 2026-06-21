'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/entities/tenant';
import { resolveReceptionAvailabilityHint } from '@/entities/tenant/lib/resolveReceptionAvailabilityHint';
import { useForeignGuestRegistration, useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import { createWhatsappLink } from '@/shared/lib';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  ExternalServiceButton,
  Icon,
} from '@/shared/ui';
import { ArrowLeftRight, Phone } from 'lucide-react';

interface CheckInRequiredSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckInRequiredSheet({ open, onOpenChange }: CheckInRequiredSheetProps) {
  const { name, hostel } = useTenant();
  const { currentTenantSlug } = useGuestSession();
  const foreignRegistration = useForeignGuestRegistration();
  const t = useTranslations('pages.checkIn.checkInRequired');
  const tCross = useTranslations('pages.checkIn.crossHostel');
  const tReception = useTranslations('components.taxi');
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';

  const receptionContact = useMemo(() => {
    const whatsappPhone = hostel.reception.whatsapp.raw;
    const message = t('whatsappMessage', { hostelName: name });

    if (hostel.reception.whatsappEnabled && whatsappPhone) {
      return {
        whatsappHref: createWhatsappLink(whatsappPhone, message),
        telHref: null as string | null,
        availabilityHint: resolveReceptionAvailabilityHint(hostel.reception, (key, params) =>
          tReception(key, params)
        ),
      };
    }

    if (hostel.contacts.phone.href) {
      return {
        whatsappHref: null,
        telHref: hostel.contacts.phone.href,
        availabilityHint: resolveReceptionAvailabilityHint(hostel.reception, (key, params) =>
          tReception(key, params)
        ),
      };
    }

    return null;
  }, [hostel, name, t, tReception]);

  const registeredUrl = foreignRegistration
    ? getTenantPublicUrl(foreignRegistration.tenantSlug, 'app', locale)
    : null;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
          <BottomSheetTitle>{t('title')}</BottomSheetTitle>
          <BottomSheetDescription>{t('description')}</BottomSheetDescription>
        </BottomSheetHeader>

        <div className="space-y-4 px-6 pb-2">
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <span className="pt-0.5">{t('step1')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <span className="pt-0.5">{t('step2')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <span className="pt-0.5">{t('step3')}</span>
            </li>
          </ol>

          {foreignRegistration && currentTenantSlug ? (
            <div className="flex gap-2.5 border-l-4 border-amber-500 bg-amber-50/95 py-2 pl-3 pr-2">
              <Icon icon={ArrowLeftRight} className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold leading-snug text-amber-950">
                  {tCross('stripSummary', {
                    registeredHostel: foreignRegistration.tenantSlug,
                    bed: foreignRegistration.bedId,
                    currentHostel: name,
                  })}
                </p>
                <p className="text-[11px] leading-snug text-amber-900/85">{tCross('sheetHint')}</p>
                {registeredUrl ? (
                  <a
                    href={registeredUrl}
                    className="inline-block text-xs font-medium text-amber-950 underline underline-offset-2 hover:text-amber-900"
                  >
                    {tCross('goToRegisteredHostel')} →
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <BottomSheetFooter>
          {receptionContact?.whatsappHref ? (
            <ExternalServiceButton service="whatsapp" href={receptionContact.whatsappHref}>
              {t('whatsappReception')}
            </ExternalServiceButton>
          ) : receptionContact?.telHref ? (
            <Button asChild size="lg" className="w-full">
              <a href={receptionContact.telHref} className="flex items-center justify-center gap-2">
                <Icon icon={Phone} className="size-4" />
                {t('callReception')}
              </a>
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t('noContact')}</p>
          )}
          {receptionContact?.availabilityHint ? (
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              {receptionContact.availabilityHint}
            </p>
          ) : null}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
