'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForeignGuestRegistration, useGuestSession, useIsGuestRegistered } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import {
  dismissCrossHostelBanner,
  isCrossHostelBannerDismissed,
} from '@/shared/lib/guestRegistrationIndex';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';

interface CrossHostelStripProps {
  showRoutesHint?: boolean;
  className?: string;
}

export function CrossHostelStrip({ showRoutesHint = false, className }: CrossHostelStripProps) {
  const { currentTenantSlug } = useGuestSession();
  const foreignRegistration = useForeignGuestRegistration();
  const isRegistered = useIsGuestRegistered();
  const t = useTranslations('pages.checkIn.crossHostel');
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isRegistered || !foreignRegistration || !currentTenantSlug) {
      setVisible(false);
      return;
    }

    const dismissed = isCrossHostelBannerDismissed(currentTenantSlug, foreignRegistration.tenantSlug);
    setVisible(!dismissed);
  }, [foreignRegistration, currentTenantSlug, isRegistered]);

  if (!foreignRegistration || !currentTenantSlug || !visible) {
    return null;
  }

  const registeredUrl = getTenantPublicUrl(foreignRegistration.tenantSlug, 'app', locale);

  const handleDismiss = () => {
    dismissCrossHostelBanner(currentTenantSlug, foreignRegistration.tenantSlug);
    setVisible(false);
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-10 -mx-4 border-b border-amber-200/80 bg-amber-50/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-amber-50/90 sm:-mx-0 sm:rounded-lg sm:border sm:px-3',
        className
      )}
    >
      <p className="text-xs font-medium leading-snug text-foreground">
        {t('stripSummary', {
          registeredHostel: foreignRegistration.tenantSlug,
          bed: foreignRegistration.bedId,
          currentHostel: currentTenantSlug,
        })}
      </p>
      {showRoutesHint ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t('routesHint', { currentHostel: currentTenantSlug })}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
          <a href={registeredUrl}>{t('goToRegisteredHostel')}</a>
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={handleDismiss}>
          {t('dismiss')}
        </Button>
      </div>
    </div>
  );
}
