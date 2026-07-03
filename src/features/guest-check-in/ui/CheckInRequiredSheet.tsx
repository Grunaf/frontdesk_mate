'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTenant } from '@/entities/tenant';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import {
  ReceptionContactActions,
  useReceptionContactLabels,
} from '@/features/reception-contact';
import { useForeignGuestRegistration, useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  Icon,
} from '@/shared/ui';
import { ArrowLeftRight } from 'lucide-react';

interface CheckInRequiredSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckInRequiredSheet({ open, onOpenChange }: CheckInRequiredSheetProps) {
  const { name, hostel, slug } = useTenant();
  const { currentTenantSlug } = useGuestSession();
  const foreignRegistration = useForeignGuestRegistration();
  const t = useTranslations('pages.checkIn.checkInRequired');
  const tCross = useTranslations('pages.checkIn.crossHostel');
  const receptionLabels = useReceptionContactLabels();
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const checkInPath = `/${locale}/check-in`;

  const receptionContact = useMemo(
    () =>
      resolveReceptionContact(hostel, {
        message: t('whatsappMessage', { hostelName: name }),
        urgency: 'high',
        translate: receptionLabels.translateHint,
      }),
    [hostel, name, receptionLabels.translateHint, t]
  );

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

        <BottomSheetBody className="pb-2">
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
            <div className="mt-4 flex gap-2.5 border-l-4 border-amber-500 bg-amber-50/95 py-2 pl-3 pr-2">
              <Icon icon={ArrowLeftRight} className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold leading-snug text-amber-950">
                  {tCross('stripSummary', {
                    registeredHostel: foreignRegistration.tenantSlug,
                    bed: foreignRegistration.bedId,
                    currentHostel: name,
                  })}
                </p>
                <p className="text-sm leading-snug text-amber-900/85">{tCross('sheetHint')}</p>
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
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button asChild size="lg" className="w-full">
            <Link href={checkInPath}>{t('signIn')}</Link>
          </Button>
          {receptionContact ? (
            <ReceptionContactActions
              contact={receptionContact}
              labels={{ message: receptionLabels.message, call: receptionLabels.call }}
              analyticsContext="check_in"
              tenantSlug={slug}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t('noContact')}</p>
          )}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
