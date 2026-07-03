'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useGuestSession } from '@/features/guest-check-in';
import { resolveTourismRegistrationProfile, useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
} from '@/shared/ui';
import {
  completeTourismRegistrationAction,
} from '../actions/completeTourismRegistrationAction';
import {
  listTourismGuestsForSessionAction,
  type TourismGuestListItem,
} from '../actions/listTourismGuestsForSessionAction';
import { validateTourismWhatsapp } from '../lib/validateTourismWhatsapp';
import { AddTourismGuestForm } from './AddTourismGuestForm';
import { TourismGuestList } from './TourismGuestList';

type TourismRegistrationPanelProps = {
  onComplete: () => void;
};

export function TourismRegistrationPanel({ onComplete }: TourismRegistrationPanelProps) {
  const t = useTranslations('pages.arrivalJourney.register');
  const { slug: tenantSlug, settings } = useTenant();
  const { session } = useGuestSession();
  const profile = resolveTourismRegistrationProfile(settings);
  const countryVars = { country: profile?.countryNameKey ?? '' };

  const [guests, setGuests] = useState<TourismGuestListItem[]>([]);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [savedWhatsapp, setSavedWhatsapp] = useState<string | null>(null);
  const [everyoneListed, setEveryoneListed] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isGuestUploadPending, setIsGuestUploadPending] = useState(false);
  const [isCompleting, startCompleteTransition] = useTransition();

  const reservationName = session?.guestName?.trim() ?? '';

  const refreshGuests = useCallback(async () => {
    const result = await listTourismGuestsForSessionAction(tenantSlug);
    if (!result.ok) {
      setLoadError(
        result.error === 'unauthorized' ? t('errors.unauthorized') : t('errors.generic')
      );
      return false;
    }

    setGuests(result.guests);
    setRegistrationComplete(result.complete);
    setSavedWhatsapp(result.contactWhatsapp);
    setLoadError(null);
    return true;
  }, [tenantSlug, t]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoadingList(true);
      const result = await listTourismGuestsForSessionAction(tenantSlug);
      if (cancelled) return;

      if (!result.ok) {
        setLoadError(
          result.error === 'unauthorized' ? t('errors.unauthorized') : t('errors.generic')
        );
        setIsLoadingList(false);
        return;
      }

      setGuests(result.guests);
      setRegistrationComplete(result.complete);
      setSavedWhatsapp(result.contactWhatsapp);
      if (result.contactWhatsapp) {
        setContactWhatsapp(result.contactWhatsapp);
      }
      setIsLoadingList(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, t]);

  const handleGuestAdded = useCallback(async () => {
    setIsGuestUploadPending(true);
    try {
      await refreshGuests();
    } finally {
      setIsGuestUploadPending(false);
    }
  }, [refreshGuests]);

  const whatsappValidation = validateTourismWhatsapp(contactWhatsapp);
  const whatsappValid = whatsappValidation.ok;

  const completeDisabled =
    registrationComplete ||
    guests.length < 1 ||
    !everyoneListed ||
    !whatsappValid ||
    isGuestUploadPending ||
    isCompleting ||
    isLoadingList;

  const resolveCompleteError = (code: string): string => {
    switch (code) {
      case 'invalid_whatsapp':
      case 'whatsapp_required':
        return t('errors.invalidWhatsapp');
      case 'no_guests':
        return t('errors.noGuests');
      case 'unauthorized':
        return t('errors.unauthorized');
      case 'feature_disabled':
        return t('errors.featureDisabled');
      case 'db_unavailable':
        return t('errors.dbUnavailable');
      default:
        return t('errors.generic');
    }
  };

  const handleComplete = () => {
    setCompleteError(null);
    setWhatsappError(null);

    const validation = validateTourismWhatsapp(contactWhatsapp);
    if (!validation.ok) {
      setWhatsappError(t('errors.invalidWhatsapp'));
      return;
    }

    startCompleteTransition(async () => {
      const result = await completeTourismRegistrationAction(tenantSlug, contactWhatsapp);
      if (!result.ok) {
        setCompleteError(resolveCompleteError(result.error));
        if (result.error === 'invalid_whatsapp' || result.error === 'whatsapp_required') {
          setWhatsappError(t('errors.invalidWhatsapp'));
        }
        return;
      }

      setRegistrationComplete(true);
      setSavedWhatsapp(validation.e164);
      onComplete();
    });
  };

  if (isLoadingList) {
    return (
      <div className="flex items-center gap-2 pt-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('loading')}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="pt-5">
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (registrationComplete) {
    return (
      <div className="space-y-6 pt-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t('complete.summaryTitle')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('intro.description', countryVars)}</p>
        </div>

        {reservationName ? (
          <div className="space-y-1">
            <Label>{t('reservationName.label')}</Label>
            <p className="text-sm font-medium text-foreground">{reservationName}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">{t('guestList.heading')}</h3>
          <TourismGuestList guests={guests} />
        </div>

        {savedWhatsapp ? (
          <div className="space-y-1">
            <Label>{t('contact.whatsapp')}</Label>
            <p className="text-sm font-medium text-foreground">{savedWhatsapp}</p>
          </div>
        ) : null}

        <Button size="lg" className="w-full" onClick={onComplete}>
          {t('complete.continue')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{t('intro.title', countryVars)}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('intro.description', countryVars)}</p>
        <div className="space-y-1 pt-1">
          <p className="text-sm font-medium text-foreground">{t('privacy.title')}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('privacy.body')}</p>
        </div>
      </div>

      {reservationName ? (
        <div className="space-y-1 rounded-xl border bg-muted/20 p-4">
          <Label>{t('reservationName.label')}</Label>
          <p className="text-sm font-medium text-foreground">{reservationName}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{t('guestList.heading')}</h3>
        <TourismGuestList guests={guests} />
      </div>

      <AddTourismGuestForm
        tenantSlug={tenantSlug}
        requiredDocumentKinds={profile?.requiredDocumentKinds ?? ['passport', 'entry_stamp']}
        disabled={isGuestUploadPending}
        onUploadPendingChange={setIsGuestUploadPending}
        onGuestAdded={handleGuestAdded}
      />

      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{t('contact.heading')}</h3>
          <p className="text-xs text-muted-foreground">{t('contact.hint')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tourism-whatsapp">{t('contact.whatsapp')}</Label>
          <Input
            id="tourism-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={contactWhatsapp}
            onChange={(e) => {
              setContactWhatsapp(e.target.value);
              setWhatsappError(null);
            }}
            onBlur={() => {
              if (!contactWhatsapp.trim()) return;
              const result = validateTourismWhatsapp(contactWhatsapp);
              if (!result.ok) {
                setWhatsappError(t('errors.invalidWhatsapp'));
              }
            }}
            disabled={isCompleting}
            aria-invalid={Boolean(whatsappError)}
          />
          {whatsappError ? (
            <p className="text-xs text-destructive">{whatsappError}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-foreground',
            isCompleting && 'pointer-events-none opacity-60'
          )}
        >
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 rounded border border-input accent-primary"
            checked={everyoneListed}
            onChange={(e) => setEveryoneListed(e.target.checked)}
            disabled={isCompleting}
          />
          <span>{t('finish.confirmLabel')}</span>
        </label>

        {completeError ? (
          <Alert variant="destructive">
            <AlertDescription>{completeError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          size="lg"
          className="w-full"
          disabled={completeDisabled}
          onClick={handleComplete}
        >
          {isCompleting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('finish.submitting')}
            </>
          ) : (
            t('finish.submit')
          )}
        </Button>
      </div>
    </div>
  );
}
