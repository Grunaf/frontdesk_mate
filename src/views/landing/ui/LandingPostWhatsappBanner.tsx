'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import { useTenant } from '@/entities/tenant';
import { LANDING_WA_FOLLOWUP_STORAGE_KEY } from '@/features/booking/lib/getHeroWhatsappBookingLink';
import { Button, Icon } from '@/shared/ui';
import { X } from 'lucide-react';

export function LandingPostWhatsappBanner() {
  const t = useTranslations('pages.landing.postWhatsapp');
  const locale = useLocale();
  const { slug, lifecycleStatus } = useTenant();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      setVisible(sessionStorage.getItem(LANDING_WA_FOLLOWUP_STORAGE_KEY) === '1');
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('landing-wa-followup', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('landing-wa-followup', sync);
    };
  }, []);

  if (!visible || lifecycleStatus !== 'active') {
    return null;
  }

  const welcomeUrl = getTenantPublicUrl(slug, 'app', locale, '/welcome');

  const dismiss = () => {
    sessionStorage.removeItem(LANDING_WA_FOLLOWUP_STORAGE_KEY);
    setVisible(false);
  };

  const scrollToRooms = () => {
    dismiss();
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-left">
          <p className="text-sm font-medium text-foreground">{t('title')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <a href={welcomeUrl}>{t('openGuestApp')}</a>
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={scrollToRooms}>
            {t('keepBrowsing')}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            aria-label={t('dismiss')}
          >
            <Icon icon={X} className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
