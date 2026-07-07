'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/shared/i18n';
import { Alert, AlertDescription, Button, IconBackActionsRow, Input, Label } from '@/shared/ui';
import { validateTourismWhatsapp } from '@/features/guest-tourism-registration';
import { saveStayContactAction } from '../actions/saveStayContactAction';

type StayContactStepPanelProps = {
  tenantSlug: string;
  initialContactWhatsapp?: string | null;
  onComplete: (savedWhatsapp: string) => void;
  interactionEnabled?: boolean;
  onBack?: () => void;
};

export function StayContactStepPanel({
  tenantSlug,
  initialContactWhatsapp,
  onComplete,
  interactionEnabled = true,
  onBack,
}: StayContactStepPanelProps) {
  const t = useTranslations('pages.staySetup.contact');
  const [contactWhatsapp, setContactWhatsapp] = useState(initialContactWhatsapp ?? '');
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    setContactWhatsapp(initialContactWhatsapp ?? '');
  }, [initialContactWhatsapp]);

  const handleSave = useCallback(() => {
    if (!interactionEnabled) {
      return;
    }

    setSaveError(null);
    setWhatsappError(null);

    const validation = validateTourismWhatsapp(contactWhatsapp);
    if (!validation.ok) {
      setWhatsappError(t('errors.invalidWhatsapp'));
      return;
    }

    startSaveTransition(async () => {
      const result = await saveStayContactAction(tenantSlug, contactWhatsapp);
      if (!result.ok) {
        if (result.error === 'invalid_whatsapp') {
          setWhatsappError(t('errors.invalidWhatsapp'));
          return;
        }
        setSaveError(t('errors.generic'));
        return;
      }

      onComplete(validation.e164);
    });
  }, [contactWhatsapp, interactionEnabled, onComplete, t, tenantSlug]);

  return (
    <div className="flex min-h-full flex-col pt-2">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stay-contact-whatsapp">{t('whatsappLabel')}</Label>
          <Input
            id="stay-contact-whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={contactWhatsapp}
            onChange={(e) => {
              setContactWhatsapp(e.target.value);
              setWhatsappError(null);
            }}
            onBlur={() => {
              if (!contactWhatsapp.trim()) {
                return;
              }
              const result = validateTourismWhatsapp(contactWhatsapp);
              if (!result.ok) {
                setWhatsappError(t('errors.invalidWhatsapp'));
              }
            }}
            disabled={!interactionEnabled || isSaving}
            aria-invalid={Boolean(whatsappError)}
          />
          {whatsappError ? <p className="text-xs text-destructive">{whatsappError}</p> : null}
          <p className="text-xs text-muted-foreground">{t('hint')}</p>
        </div>

        {saveError ? (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

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
    </div>
  );
}
