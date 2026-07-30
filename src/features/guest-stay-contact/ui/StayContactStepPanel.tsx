'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/min';
import { getCountries } from 'libphonenumber-js/min';
import { resolveTourismRegistrationConfig, useTenant } from '@/entities/tenant';
import { useLocale, useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Alert, AlertDescription, Button, IconBackActionsRow } from '@/shared/ui';
import { validateTourismWhatsapp } from '@/features/guest-tourism-registration';
import { saveStayContactAction } from '../actions/saveStayContactAction';
import { GuestPhoneNumberField } from './GuestPhoneNumberField';

export type StayContactNavigationMode = 'standalone' | 'wizard';

const FALLBACK_PHONE_COUNTRY: CountryCode = 'ME';
const KNOWN_PHONE_COUNTRIES = new Set<string>(getCountries());

function resolveDefaultPhoneCountry(profileId: string | undefined): CountryCode {
  if (!profileId) {
    return FALLBACK_PHONE_COUNTRY;
  }
  const code = profileId.trim().toUpperCase();
  if (KNOWN_PHONE_COUNTRIES.has(code)) {
    return code as CountryCode;
  }
  return FALLBACK_PHONE_COUNTRY;
}

type StayContactStepPanelProps = {
  tenantSlug: string;
  initialContactWhatsapp?: string | null;
  /** Guest-proposed number awaiting desk confirm (shown when unlocking again). */
  initialContactPhonePending?: string | null;
  contactComplete?: boolean;
  onComplete: (savedWhatsapp: string) => void;
  onDraftChange?: (draft: string) => void;
  /**
   * Fired when guest unlocks a confirmed number for edit (`true`),
   * and when they lock again / panel unmounts (`false`).
   */
  onEditingChange?: (editing: boolean) => void;
  interactionEnabled?: boolean;
  onBack?: () => void;
  navigationMode?: StayContactNavigationMode;
  showIntroHeading?: boolean;
  /** Override property default country (ISO-3166 alpha-2). */
  defaultCountry?: CountryCode;
};

export function StayContactStepPanel({
  tenantSlug,
  initialContactWhatsapp,
  initialContactPhonePending,
  contactComplete = false,
  onComplete,
  onDraftChange,
  onEditingChange,
  interactionEnabled = true,
  onBack,
  navigationMode = 'standalone',
  showIntroHeading = true,
  defaultCountry,
}: StayContactStepPanelProps) {
  const t = useTranslations('pages.staySetup.contact');
  const locale = useLocale();
  const { settings } = useTenant();
  const resolvedDefaultCountry = useMemo(() => {
    if (defaultCountry) {
      return defaultCountry;
    }
    const profileId = resolveTourismRegistrationConfig(settings)?.profileId;
    return resolveDefaultPhoneCountry(profileId);
  }, [defaultCountry, settings]);

  const confirmedPhone = initialContactWhatsapp?.trim() || '';
  const pendingPhone = initialContactPhonePending?.trim() || '';
  const hasConfirmed = contactComplete && Boolean(confirmedPhone);

  const [unlocked, setUnlocked] = useState(false);
  const [contactWhatsapp, setContactWhatsapp] = useState(
    () => pendingPhone || confirmedPhone
  );
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSubmitted, setPendingSubmitted] = useState(Boolean(pendingPhone));
  const [isSaving, startSaveTransition] = useTransition();

  const isLocked = hasConfirmed && !unlocked;
  const contactEditing = hasConfirmed && unlocked;

  useEffect(() => {
    onEditingChange?.(contactEditing);
    return () => {
      onEditingChange?.(false);
    };
  }, [contactEditing, onEditingChange]);

  useEffect(() => {
    if (isLocked) {
      setContactWhatsapp(confirmedPhone);
      return;
    }
    if (!unlocked) {
      setContactWhatsapp(pendingPhone || confirmedPhone);
    }
  }, [confirmedPhone, isLocked, pendingPhone, unlocked]);

  const persistContact = useCallback(
    (raw: string): Promise<boolean> => {
      if (!interactionEnabled || isLocked) {
        return Promise.resolve(false);
      }

      setSaveError(null);
      setWhatsappError(null);

      const validation = validateTourismWhatsapp(raw);
      if (!validation.ok) {
        setWhatsappError(t('errors.invalidWhatsapp'));
        return Promise.resolve(false);
      }

      return new Promise((resolve) => {
        startSaveTransition(async () => {
          const result = await saveStayContactAction(tenantSlug, raw);
          if (!result.ok) {
            if (result.error === 'invalid_whatsapp') {
              setWhatsappError(t('errors.invalidWhatsapp'));
            } else {
              setSaveError(t('errors.generic'));
            }
            resolve(false);
            return;
          }

          if (result.mode === 'pending') {
            setPendingSubmitted(true);
            setUnlocked(false);
            setContactWhatsapp(validation.e164);
          }

          onComplete(validation.e164);
          resolve(true);
        });
      });
    },
    [interactionEnabled, isLocked, onComplete, t, tenantSlug]
  );

  const handleSave = useCallback(() => {
    void persistContact(contactWhatsapp);
  }, [contactWhatsapp, persistContact]);

  const handleWizardBlurSave = useCallback(() => {
    if (navigationMode !== 'wizard' || isLocked || contactComplete) {
      return;
    }

    const validation = validateTourismWhatsapp(contactWhatsapp);
    if (!validation.ok) {
      return;
    }

    void persistContact(contactWhatsapp);
  }, [contactComplete, contactWhatsapp, isLocked, navigationMode, persistContact]);

  const handleUnlock = useCallback(() => {
    setUnlocked(true);
    setContactWhatsapp(pendingPhone || confirmedPhone);
    setWhatsappError(null);
    setSaveError(null);
  }, [confirmedPhone, pendingPhone]);

  const showFooter = !isLocked;
  const isUnlockEdit = hasConfirmed && unlocked;
  const panelTopPadding = showIntroHeading ? 'pt-2' : 'pt-0';

  const saveButton = (
    <Button
      size="lg"
      variant={isUnlockEdit ? 'secondary' : 'default'}
      className="w-full"
      disabled={!interactionEnabled || isSaving}
      onClick={handleSave}
    >
      {isSaving ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('saving')}
        </>
      ) : isUnlockEdit ? (
        t('save')
      ) : (
        t('continue')
      )}
    </Button>
  );

  return (
    <div
      className={cn('flex flex-col', panelTopPadding)}
      onBlur={navigationMode === 'wizard' && !showFooter ? handleWizardBlurSave : undefined}
    >
      <div className="space-y-6">
        {showIntroHeading ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
        )}

        <GuestPhoneNumberField
          id="stay-contact-whatsapp"
          countrySelectId="stay-contact-country"
          value={contactWhatsapp}
          onChange={(next) => {
            setContactWhatsapp(next);
            onDraftChange?.(next);
            setWhatsappError(null);
          }}
          disabled={!interactionEnabled || isSaving}
          locked={isLocked}
          invalid={Boolean(whatsappError)}
          label={t('whatsappLabel')}
          countryLabel={t('countryLabel')}
          locale={locale}
          defaultCountry={resolvedDefaultCountry}
          savedBadge={
            isLocked
              ? pendingSubmitted || pendingPhone
                ? t('pendingBadge')
                : t('savedBadge')
              : undefined
          }
        />
        {whatsappError ? <p className="text-xs text-destructive">{whatsappError}</p> : null}
        {!isLocked ? <p className="text-xs text-muted-foreground">{t('hint')}</p> : null}
        {isLocked && (pendingSubmitted || pendingPhone) ? (
          <p className="text-xs text-muted-foreground">{t('pendingHint')}</p>
        ) : null}

        {hasConfirmed && !unlocked ? (
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
            disabled={!interactionEnabled || isSaving}
            onClick={handleUnlock}
          >
            {t('changeNumber')}
          </button>
        ) : null}
        {hasConfirmed && unlocked ? (
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            disabled={!interactionEnabled || isSaving}
            onClick={() => {
              setUnlocked(false);
              setContactWhatsapp(confirmedPhone);
              setWhatsappError(null);
              setSaveError(null);
            }}
          >
            {t('keepCurrentNumber')}
          </button>
        ) : null}

        {saveError ? (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {showFooter ? (
        isUnlockEdit ? (
          <div className="pt-6 pb-2">{saveButton}</div>
        ) : (
          <IconBackActionsRow className="pt-6 pb-2" onBack={onBack}>
            {saveButton}
          </IconBackActionsRow>
        )
      ) : null}
    </div>
  );
}
