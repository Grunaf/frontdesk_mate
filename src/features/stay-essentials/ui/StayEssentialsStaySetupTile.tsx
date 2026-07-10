'use client';

import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useTenant } from '@/entities/tenant';
import { useIsGuestRegistered } from '@/features/guest-check-in';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';
import { useTranslations, useLocale } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { Icon, PressableTileButton, useAppNavigation } from '@/shared/ui';
import { STAY_ESSENTIAL_STAY_SETUP_TILE_TINT } from '../lib/resolveStayEssentialBridgeTint';
import { STAY_ESSENTIAL_STAY_SETUP_TILE_ID } from '../model/types';
import { useStayEssentialTileReadState } from '../model/useStayEssentialTileReadState';
import { stayEssentialsTileClassName } from './stayEssentialsTileClassName';

export function StayEssentialsStaySetupTile() {
  const t = useTranslations('components.stayEssentials');
  const locale = useLocale();
  const { push, pending } = useAppNavigation();
  const { slug } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const { isRead, markRead } = useStayEssentialTileReadState(STAY_ESSENTIAL_STAY_SETUP_TILE_ID);
  const title = t('bridges.staySetup');
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!isRegistered || !slug) {
      setProgressLabel(null);
      return;
    }

    let cancelled = false;
    void getStaySetupStatusAction(slug).then((result) => {
      if (cancelled || !result.ok) {
        return;
      }
      const { completedSteps, totalSteps, tourismRequired, tourismComplete, contactComplete } =
        result.status;
      const prerequisitesComplete =
        (!tourismRequired || tourismComplete) && contactComplete;
      if (prerequisitesComplete) {
        setProgressLabel(null);
        return;
      }
      setProgressLabel(`${completedSteps}/${totalSteps}`);
    });

    return () => {
      cancelled = true;
    };
  }, [isRegistered, slug]);

  const { className, style } = stayEssentialsTileClassName({
    isRead,
    accentColor: STAY_ESSENTIAL_STAY_SETUP_TILE_TINT,
  });

  return (
    <PressableTileButton
      pending={pending}
      onClick={() => {
        markRead();
        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        push(`/${locale}${SITE_CONFIG.routes.app.staySetup.path}`);
      }}
      className={className}
      style={style}
      aria-label={title}
      data-testid="stay-bridge-staySetup"
      data-read={isRead ? 'read' : 'unread'}
    >
      <span className="absolute top-2.5 right-2.5 left-2.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {title}
      </span>

      {progressLabel ? (
        <span className="absolute top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {progressLabel}
        </span>
      ) : null}

      <div className="absolute bottom-2 left-2 text-muted-foreground">
        <Icon icon={ClipboardList} className="h-7 w-7" />
      </div>
    </PressableTileButton>
  );
}
