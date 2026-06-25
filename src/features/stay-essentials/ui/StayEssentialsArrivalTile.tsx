'use client';

import { MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { Icon } from '@/shared/ui';
import { stayEssentialsTileClassName } from './stayEssentialsTileClassName';

export function StayEssentialsArrivalTile() {
  const t = useTranslations('pages.concierge');
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        router.push(SITE_CONFIG.routes.app.welcome.path);
      }}
      className={stayEssentialsTileClassName({ isRead: false }).className}
    >
      <span className="absolute top-2.5 right-2.5 left-2.5 line-clamp-2 text-sm font-medium leading-snug text-foreground">
        {t('arrivalGuideButton')}
      </span>

      <div className="absolute bottom-2 left-2 text-muted-foreground">
        <Icon icon={MapPin} className="h-7 w-7" />
      </div>
    </button>
  );
}
