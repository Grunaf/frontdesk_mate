'use client';

import { useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getCleanPath, SITE_CONFIG } from '@/shared/config';
import { getInAppReturnTo } from '@/shared/lib';
import { TenantBrand } from '@/entities/tenant/ui/TenantBrand';
import { TenantContext } from '@/entities/tenant/ui/tenant-context';
import {
  useForeignGuestRegistration,
  useIsGuestRegistered,
} from '@/features/guest-check-in';
import { GuestStayChip, shouldShowGuestStayChip } from '@/features/guest-stay-chip';
import { useTranslations } from '@/shared/i18n';
import { Button } from '../button';
import { Icon } from '../icon';
import { resolveAppHeaderMode } from './resolveAppHeaderMode';

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
  const isRegistered = useIsGuestRegistered();
  const foreignRegistration = useForeignGuestRegistration();

  const cleanPath = getCleanPath(pathname);
  const headerMode = resolveAppHeaderMode(cleanPath);
  const currentTitle = translatedTitles[cleanPath];
  const showStayChip = shouldShowGuestStayChip({
    cleanPath,
    isRegistered,
    hasForeignRegistration: Boolean(foreignRegistration),
  });

  const [inAppReturnTo, setInAppReturnTo] = useState<string | null>(null);

  useEffect(() => {
    setInAppReturnTo(getInAppReturnTo());
  }, [pathname]);

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

  const labeledBackToConcierge = (
    <Button
      onClick={goBackInApp}
      variant="ghost"
      size="sm"
      className="-ml-1 h-auto max-w-full gap-1 px-2"
      aria-label={navigation('backToConcierge')}
    >
      <Icon icon={ChevronLeft} className="h-5 w-5 shrink-0" />
      <span className="truncate text-sm font-medium">{navigation('concierge')}</span>
    </Button>
  );

  const iconBack = (
    <Button
      onClick={goBackInApp}
      variant="ghost"
      size="icon-sm"
      className="-ml-1 shrink-0"
      aria-label={navigation('back')}
    >
      <Icon icon={ChevronLeft} className="h-5 w-5" />
    </Button>
  );

  const pageTitle =
    headerMode !== 'concierge' ? (
      <h1 className="min-w-0 truncate text-lg font-semibold text-foreground">
        {currentTitle || displayName}
      </h1>
    ) : null;

  const leadingSlot =
    headerMode === 'concierge'
      ? brand
      : headerMode === 'arrivalGuide'
        ? labeledBackToConcierge
        : headerMode === 'nested'
          ? iconBack
          : null;

  return (
    <header className="px-4 pt-5 pb-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {leadingSlot}
          {pageTitle}
        </div>

        {showStayChip ? <GuestStayChip /> : null}
      </div>
    </header>
  );
}
