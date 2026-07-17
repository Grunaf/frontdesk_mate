'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { activateGuestStayAction } from '../actions/activateGuestStay';
import { previewGuestStayAction } from '../actions/previewGuestStay';
import { parseGuestEntryParam } from '../lib/resolveGuestWelcomePath';
import { guestEntryToIntent, readGuestIntent, writeGuestIntent } from '../lib/guestIntent';
import { resolvePostCheckInPath } from '../lib/resolveGuestLanding';
import { resolveStaySwitchDecision } from '../lib/resolveStaySwitchDecision';
import { CheckInPinForm } from './CheckInPinForm';
import { StaySwitchConfirm } from './StaySwitchConfirm';
import { useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { trackCheckInSuccess } from '@/shared/lib/analytics';
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
  const { isRegistered, currentTenantSlug, session } = useGuestSession();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [correctTenantSlug, setCorrectTenantSlug] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{
    bedId: string;
    stayId: string;
  } | null>(null);
  const [pinSwitchActive, setPinSwitchActive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const handledTokenRef = useRef<string | null>(null);

  const token = searchParams.get('t')?.trim() ?? '';
  const entry = parseGuestEntryParam(searchParams.get('entry'));
  const modeOnsite = searchParams.get('mode') === 'onsite';
  const storedIntent = currentTenantSlug ? readGuestIntent(currentTenantSlug) : null;
  const landingPath = resolvePostCheckInPath({
    locale,
    urlEntry: entry,
    modeOnsite,
    storedIntent,
  });

  const persistEntryIntent = (tenantSlug: string) => {
    if (entry) {
      writeGuestIntent(tenantSlug, guestEntryToIntent(entry));
      return;
    }
    if (modeOnsite) {
      writeGuestIntent(tenantSlug, 'at_door');
    }
  };

  const finishActivation = (registration: {
    tenantSlug: string;
    bedId: string;
    exp: number;
  }) => {
    trackCheckInSuccess(registration.tenantSlug);
    writeGuestRegistrationIndex({
      tenantSlug: registration.tenantSlug,
      bedId: registration.bedId,
      exp: registration.exp,
    });
    persistEntryIntent(registration.tenantSlug);
    setPendingSwitch(null);
    router.refresh();
    router.replace(landingPath);
  };

  const activateToken = (accessToken: string) => {
    startTransition(async () => {
      const result = await activateGuestStayAction(accessToken, locale);
      if (result.ok) {
        handledTokenRef.current = accessToken;
        finishActivation(result.registration);
        return;
      }

      setCorrectTenantSlug(result.correctTenantSlug ?? null);
      setErrorKey(result.error);
      setPendingSwitch(null);
    });
  };

  useEffect(() => {
    if (!token) {
      handledTokenRef.current = null;
      setPendingSwitch(null);
      setErrorKey(null);
      setCorrectTenantSlug(null);
      return;
    }

    if (pendingSwitch) return;
    if (handledTokenRef.current === token) return;

    let cancelled = false;

    startTransition(async () => {
      setErrorKey(null);
      setCorrectTenantSlug(null);

      const preview = await previewGuestStayAction(token);
      if (cancelled) return;

      if (!preview.ok) {
        setCorrectTenantSlug(preview.correctTenantSlug ?? null);
        setErrorKey(preview.error);
        return;
      }

      const decision = resolveStaySwitchDecision({
        currentStayId: session?.stayId,
        incomingStayId: preview.stay.stayId,
      });

      if (decision === 'confirm' && session) {
        setPendingSwitch({ bedId: preview.stay.bedId, stayId: preview.stay.stayId });
        return;
      }

      handledTokenRef.current = token;
      const result = await activateGuestStayAction(token, locale);
      if (cancelled) return;

      if (result.ok) {
        finishActivation(result.registration);
        return;
      }

      handledTokenRef.current = null;
      setCorrectTenantSlug(result.correctTenantSlug ?? null);
      setErrorKey(result.error);
    });

    return () => {
      cancelled = true;
    };
    // Intentionally tied to token + current stay identity only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, session?.stayId]);

  if (token) {
    if (pendingSwitch && session) {
      return (
        <StaySwitchConfirm
          currentBedId={session.bedId}
          incomingBedId={pendingSwitch.bedId}
          isPending={isPending}
          onSwitch={() => activateToken(token)}
          onKeep={() => {
            persistEntryIntent(session.tenantSlug);
            handledTokenRef.current = token;
            setPendingSwitch(null);
            router.replace(landingPath);
          }}
        />
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        {isPending && !errorKey ? (
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
                <a
                  href={
                    getTenantPublicUrl(correctTenantSlug, 'app', locale, '/check-in') +
                    `?t=${encodeURIComponent(token)}`
                  }
                >
                  {t('wrongHostel.goToHostel')}
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.replace(`/${locale}/check-in`)}
              >
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
      {!pinSwitchActive ? (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">
              {t('waiting.eyebrow')}
            </p>
            <h1 className="text-xl font-semibold">
              {isRegistered ? t('alreadyCheckedIn.title') : t('waiting.title')}
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {isRegistered
                ? t('alreadyCheckedIn.description', { bed: session?.bedId ?? '—' })
                : t('waiting.description')}
            </p>
          </div>

          {isRegistered ? (
            <Button
              type="button"
              className="w-full max-w-sm"
              onClick={() => router.replace(landingPath)}
            >
              {t('alreadyCheckedIn.continue')}
            </Button>
          ) : null}
        </>
      ) : null}

      <CheckInPinForm locale={locale} onSwitchUiChange={setPinSwitchActive} />
    </div>
  );
}
