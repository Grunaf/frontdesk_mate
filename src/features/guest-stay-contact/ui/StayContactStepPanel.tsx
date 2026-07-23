'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/min';
import { getCountries } from 'libphonenumber-js/min';
import { resolveTourismRegistrationConfig, useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
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
  contactComplete?: boolean;
  onComplete: (savedWhatsapp: string) => void;
  onDraftChange?: (draft: string) => void;
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
  contactComplete = false,
  onComplete,
  onDraftChange,
  interactionEnabled = true,
  onBack,
  navigationMode = 'standalone',
  showIntroHeading = true,
  defaultCountry,
}: StayContactStepPanelProps) {
  const t = useTranslations('pages.staySetup.contact');
  const { settings } = useTenant();
  const resolvedDefaultCountry = useMemo(() => {
    if (defaultCountry) {
      return defaultCountry;
    }
    const profileId = resolveTourismRegistrationConfig(settings)?.profileId;
    return resolveDefaultPhoneCountry(profileId);
  }, [defaultCountry, settings]);
  const [contactWhatsapp, setContactWhatsapp] = useState(initialContactWhatsapp ?? '');
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const isLocked = contactComplete && Boolean(initialContactWhatsapp?.trim());

  useEffect(() => {
    if (!isLocked) {
      setContactWhatsapp(initialContactWhatsapp ?? '');
    }
  }, [initialContactWhatsapp, isLocked]);

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

  // Footer (chevron + primary) for pinned registration chrome on standalone and stay-setup.
  const showFooter = !isLocked;
  const panelTopPadding = showIntroHeading ? 'pt-2' : 'pt-0';

  return (
    <div
      className={cn('flex min-h-full flex-col', panelTopPadding)}
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
          defaultCountry={resolvedDefaultCountry}
          savedBadge={isLocked ? t('savedBadge') : undefined}
        />
        {whatsappError ? <p className="text-xs text-destructive">{whatsappError}</p> : null}
        {!isLocked ? <p className="text-xs text-muted-foreground">{t('hint')}</p> : null}

        {saveError ? (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {showFooter ? (
        <IconBackActionsRow className="mt-auto pt-6" onBack={onBack}>
          <Button size="lg" disabled={!interactionEnabled || isSaving} onClick={handleSave}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('saving')}
              </>
            ) : (
              t('continue')
            )}
          </Button>
        </IconBackActionsRow>
      ) : null}
    </div>
  );
}
