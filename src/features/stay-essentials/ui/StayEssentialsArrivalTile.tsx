'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { Icon, PressableTileButton, useAppNavigation } from '@/shared/ui';
import { STAY_ESSENTIAL_ARRIVAL_TILE_TINT } from '../lib/resolveStayEssentialBridgeTint';
import { STAY_ESSENTIAL_ARRIVAL_TILE_ID } from '../model/types';
import { useStayEssentialTileReadState } from '../model/useStayEssentialTileReadState';
import { stayEssentialsTileClassName } from './stayEssentialsTileClassName';

export function StayEssentialsArrivalTile() {
  const t = useTranslations('components.stayEssentials');
  const { push, pending } = useAppNavigation();
  const { isRead, markRead } = useStayEssentialTileReadState(STAY_ESSENTIAL_ARRIVAL_TILE_ID);
  const title = t('bridges.arrivalGuide');
  const { className, style } = stayEssentialsTileClassName({
    isRead,
    accentColor: STAY_ESSENTIAL_ARRIVAL_TILE_TINT,
  });

  return (
    <PressableTileButton
      pending={pending}
      onClick={() => {
        markRead();
        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        push(SITE_CONFIG.routes.app.welcome.path);
      }}
      className={className}
      style={style}
      aria-label={title}
      data-testid="stay-bridge-arrivalGuide"
      data-read={isRead ? 'read' : 'unread'}
    >
      <span className="absolute top-2.5 right-2.5 left-2.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {title}
      </span>

      <div className="absolute bottom-2 left-2 text-muted-foreground">
        <Icon icon={MapPin} className="h-7 w-7" />
      </div>
    </PressableTileButton>
  );
}
