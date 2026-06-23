'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { activateGuestStayAction } from '../actions/activateGuestStay';
import { parseGuestEntryParam, resolveGuestWelcomePath } from '../lib/resolveGuestWelcomePath';
import { CheckInPinForm } from './CheckInPinForm';
import { useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import { writeGuestRegistrationIndex } from '@/shared/lib/guestRegistrationIndex';
import { Button, Icon } from '@/shared/ui';
import { Loader2 } from 'lucide-react';

interface CheckInPageContentProps {
  locale: string;
}

export function CheckInPageContent({ locale }: CheckInPageContentProps) {
  const t = useTranslations('pages.checkIn');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isRegistered } = useGuestSession();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [correctTenantSlug, setCorrectTenantSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const token = searchParams.get('t')?.trim() ?? '';
  const entry = parseGuestEntryParam(searchParams.get('entry'));
  const modeOnsite = searchParams.get('mode') === 'onsite';
  const welcomePath = resolveGuestWelcomePath({ locale, entry, modeOnsite });

  useEffect(() => {
    if (isRegistered && !token) {
      router.replace(welcomePath);
    }
  }, [isRegistered, token, welcomePath, router]);

  useEffect(() => {
    if (!isRegistered || !token) return;

    router.replace(welcomePath);
  }, [isRegistered, token, welcomePath, router]);

  useEffect(() => {
    if (!token || isRegistered) return;

    startTransition(async () => {
      const result = await activateGuestStayAction(token, locale);
      if (result.ok) {
        writeGuestRegistrationIndex({
          tenantSlug: result.registration.tenantSlug,
          bedId: result.registration.bedId,
          exp: result.registration.exp,
        });
        router.refresh();
        router.replace(welcomePath);
        return;
      }

      setCorrectTenantSlug(result.correctTenantSlug ?? null);
      setErrorKey(result.error);
    });
  }, [token, isRegistered, locale, router, welcomePath]);

  if (token) {
    if (isRegistered) {
      return null;
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        {isPending ? (
          <>
            <Icon icon={Loader2} className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('activating')}</p>
          </>
        ) : errorKey ? (
          <>
            <h1 className="text-lg font-semibold">{t(`errors.${errorKey}.title`)}</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t(`errors.${errorKey}.description`)}
            </p>
            {errorKey === 'wrong_hostel' && correctTenantSlug ? (
              <Button asChild className="w-full max-w-sm">
                <a href={getTenantPublicUrl(correctTenantSlug, 'app', locale, '/check-in') + `?t=${encodeURIComponent(token)}`}>
                  {t('wrongHostel.goToHostel')}
                </a>
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => router.replace(`/${locale}/check-in`)}>
                {t('backButton')}
              </Button>
            )}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10 text-center">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">{t('waiting.eyebrow')}</p>
        <h1 className="text-xl font-semibold">{t('waiting.title')}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t('waiting.description')}</p>
      </div>

      <CheckInPinForm locale={locale} />
    </div>
  );
}
