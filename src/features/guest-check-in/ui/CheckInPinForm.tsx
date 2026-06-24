'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { activateGuestStayByPinAction } from '../actions/activateGuestStayByPin';
import { parseGuestEntryParam } from '../lib/resolveGuestWelcomePath';
import { readGuestIntent } from '../lib/guestIntent';
import { resolvePostCheckInPath } from '../lib/resolveGuestLanding';
import {
  normalizePinActivationError,
  shouldQueuePinActivationError,
} from '../lib/pinActivationErrors';
import { useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { trackCheckInSuccess } from '@/shared/lib/analytics';
import { writeGuestRegistrationIndex } from '@/shared/lib/guestRegistrationIndex';
import {
  clearPendingGuestPinActivation,
  readPendingGuestPinActivation,
  writePendingGuestPinActivation,
} from '@/shared/lib/pendingGuestPinActivation';
import { Button, Icon, Input, Label } from '@/shared/ui';
import { Loader2 } from 'lucide-react';

interface CheckInPinFormProps {
  locale: string;
}

function formatPinDisplay(pin: string): string {
  const digits = pin.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function CheckInPinForm({ locale }: CheckInPinFormProps) {
  const t = useTranslations('pages.checkIn.pin');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTenantSlug, isRegistered } = useGuestSession();
  const entry = parseGuestEntryParam(searchParams.get('entry'));
  const modeOnsite = searchParams.get('mode') === 'onsite';
  const storedIntent = currentTenantSlug ? readGuestIntent(currentTenantSlug) : null;
  const [pin, setPin] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isQueued, setIsQueued] = useState(false);
  const [isPending, startTransition] = useTransition();
  const syncingRef = useRef(false);

  const completeActivation = useCallback(
    (registration: { tenantSlug: string; bedId: string; exp: number }) => {
      trackCheckInSuccess(registration.tenantSlug);
      clearPendingGuestPinActivation();
      writeGuestRegistrationIndex(registration);
      router.refresh();
      router.replace(
        resolvePostCheckInPath({ locale, urlEntry: entry, modeOnsite, storedIntent })
      );
    },
    [entry, locale, modeOnsite, router, storedIntent]
  );

  const activatePin = useCallback(
    (rawPin: string) => {
      if (!currentTenantSlug || isRegistered) return;

      const normalizedPin = rawPin.replace(/\D/g, '').slice(0, 6);
      if (normalizedPin.length !== 6) return;

      setErrorKey(null);
      setIsQueued(false);

      startTransition(async () => {
        if (!navigator.onLine) {
          writePendingGuestPinActivation({
            tenantSlug: currentTenantSlug,
            pin: normalizedPin,
            queuedAt: Date.now(),
          });
          setIsQueued(true);
          return;
        }

        try {
          const result = await activateGuestStayByPinAction(normalizedPin, locale);
          if (result.ok) {
            completeActivation(result.registration);
            return;
          }

          if (shouldQueuePinActivationError(result.error)) {
            writePendingGuestPinActivation({
              tenantSlug: currentTenantSlug,
              pin: normalizedPin,
              queuedAt: Date.now(),
            });
            setIsQueued(true);
            return;
          }

          clearPendingGuestPinActivation();
          setErrorKey(normalizePinActivationError(result.error));
        } catch {
          writePendingGuestPinActivation({
            tenantSlug: currentTenantSlug,
            pin: normalizedPin,
            queuedAt: Date.now(),
          });
          setIsQueued(true);
        }
      });
    },
    [completeActivation, currentTenantSlug, isRegistered, locale]
  );

  const syncPending = useCallback(() => {
    if (!currentTenantSlug || isRegistered || syncingRef.current) return;

    const pending = readPendingGuestPinActivation(currentTenantSlug);
    if (!pending) return;

    setPin(pending.pin);
    setIsQueued(true);
    syncingRef.current = true;

    startTransition(async () => {
      try {
        if (!navigator.onLine) {
          syncingRef.current = false;
          return;
        }

        const result = await activateGuestStayByPinAction(pending.pin, locale);
        if (result.ok) {
          completeActivation(result.registration);
          return;
        }

        if (shouldQueuePinActivationError(result.error)) {
          syncingRef.current = false;
          return;
        }

        clearPendingGuestPinActivation();
        setIsQueued(false);
        setErrorKey(normalizePinActivationError(result.error));
        syncingRef.current = false;
      } catch {
        syncingRef.current = false;
      }
    });
  }, [completeActivation, currentTenantSlug, isRegistered, locale]);

  useEffect(() => {
    const pending = currentTenantSlug ? readPendingGuestPinActivation(currentTenantSlug) : null;
    if (pending) {
      setPin(pending.pin);
      setIsQueued(true);
    }
  }, [currentTenantSlug]);

  useEffect(() => {
    syncPending();

    const handleOnline = () => {
      syncPending();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPending]);

  const handlePinChange = (value: string) => {
    const normalized = value.replace(/\D/g, '').slice(0, 6);
    setPin(normalized);
    setErrorKey(null);
    setIsQueued(false);

    if (normalized.length === 6) {
      activatePin(normalized);
    }
  };

  if (isRegistered) {
    return null;
  }

  return (
    <div className="w-full max-w-sm space-y-4 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="guest-check-in-pin">{t('label')}</Label>
        <Input
          id="guest-check-in-pin"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={7}
          value={formatPinDisplay(pin)}
          onChange={(event) => handlePinChange(event.target.value)}
          placeholder={t('placeholder')}
          className="text-center text-2xl tracking-[0.35em] font-semibold"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">{t('hint')}</p>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Icon icon={Loader2} className="size-4 animate-spin" />
          <span>{t('activating')}</span>
        </div>
      ) : null}

      {isQueued ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">{t('queuedTitle')}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90">{t('queuedDescription')}</p>
        </div>
      ) : null}

      {errorKey ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <p className="font-medium text-destructive">{t(`errors.${errorKey}.title`)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t(`errors.${errorKey}.description`)}</p>
        </div>
      ) : null}

      {pin.length === 6 && !isPending && !isQueued ? (
        <Button type="button" className="w-full" onClick={() => activatePin(pin)}>
          {t('submit')}
        </Button>
      ) : null}
    </div>
  );
}
