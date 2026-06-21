'use client';

import { useEffect, useState } from 'react';
import { useForeignGuestRegistration, useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import {
  dismissCrossHostelBanner,
  isCrossHostelBannerDismissed,
} from '@/shared/lib/guestRegistrationIndex';
import { Alert, AlertDescription, AlertTitle, Button } from '@/shared/ui';
import { useParams } from 'next/navigation';

export function CrossHostelBanner() {
  const { currentTenantSlug } = useGuestSession();
  const foreignRegistration = useForeignGuestRegistration();
  const t = useTranslations('pages.checkIn.crossHostel');
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!foreignRegistration || !currentTenantSlug) {
      setVisible(false);
      return;
    }

    const dismissed = isCrossHostelBannerDismissed(currentTenantSlug, foreignRegistration.tenantSlug);
    setVisible(!dismissed);
  }, [foreignRegistration, currentTenantSlug]);

  if (!foreignRegistration || !currentTenantSlug || !visible) return null;

  const registeredUrl = getTenantPublicUrl(foreignRegistration.tenantSlug, 'app', locale);

  const handleDismiss = () => {
    dismissCrossHostelBanner(currentTenantSlug, foreignRegistration.tenantSlug);
    setVisible(false);
  };

  return (
    <Alert className="mb-4 border-amber-300 bg-amber-50 text-foreground">
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription className="space-y-3 text-sm text-muted-foreground">
        <p>
          {t('description', {
            registeredHostel: foreignRegistration.tenantSlug,
            bed: foreignRegistration.bedId,
            currentHostel: currentTenantSlug,
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={registeredUrl}>{t('goToRegisteredHostel')}</a>
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={handleDismiss}>
            {t('dismiss')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
