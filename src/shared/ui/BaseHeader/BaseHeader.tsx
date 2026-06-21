'use client';

import { useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getCleanPath, SITE_CONFIG } from '@/shared/config';
import {
  clearInAppReturnTo,
  getInAppReturnTo,
} from '@/shared/lib';
import { TenantBrand } from '@/entities/tenant/ui/TenantBrand';
import { TenantContext } from '@/entities/tenant/ui/tenant-context';
import { useTranslations } from '@/shared/i18n';
import { Button } from '../button';
import { Icon } from '../icon';

interface BaseHeaderProps {
  translatedTitles: Record<string, string>;
}

export function BaseHeader({ translatedTitles }: BaseHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navigation = useTranslations('pages.navigation');
  const tenant = useContext(TenantContext);
  const displayName = tenant?.name ?? 'Hostel';
  const logoUrl = tenant?.settings.logoUrl;

  const cleanPath = getCleanPath(pathname);
  const currentTitle = translatedTitles[cleanPath];
  const isConcierge = cleanPath === SITE_CONFIG.routes.app.concierge.path;
  const isArrivalGuide = cleanPath === SITE_CONFIG.routes.app.welcome.path;

  const [inAppReturnTo, setInAppReturnTo] = useState<string | null>(null);

  useEffect(() => {
    setInAppReturnTo(getInAppReturnTo());
  }, [pathname]);

  const goToConcierge = () => {
    clearInAppReturnTo();
    router.push(SITE_CONFIG.routes.app.concierge.path);
  };

  const goBackInApp = () => {
    if (inAppReturnTo) {
      router.push(inAppReturnTo);
      return;
    }

    router.push(SITE_CONFIG.routes.app.concierge.path);
  };

  const brand = (
    <TenantBrand surface="app" name={displayName} logoUrl={logoUrl} />
  );

  return (
    <header className="border-b border-border bg-card px-4 pt-5 pb-3">
      <div className="flex items-center gap-3">
        {isConcierge ? (
          brand
        ) : isArrivalGuide ? (
          <Button
            onClick={goBackInApp}
            variant="ghost"
            size="sm"
            className="-ml-1 h-auto gap-1 px-2"
            aria-label={navigation('backToConcierge')}
          >
            <Icon icon={ChevronLeft} className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{navigation('concierge')}</span>
          </Button>
        ) : (
          <button
            type="button"
            onClick={goToConcierge}
            className="-ml-1 rounded-md p-1 transition-colors hover:bg-muted"
            aria-label={navigation('goToConcierge')}
          >
            {brand}
          </button>
        )}

        {!isConcierge && (
          <h1 className="text-lg font-semibold text-foreground">{currentTitle || 'Hostel'}</h1>
        )}
      </div>
    </header>
  );
}
