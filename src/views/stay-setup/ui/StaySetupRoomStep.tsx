'use client';

import { FindYourBedPanel } from '@/features/find-your-bed';
import { useTranslations } from '@/shared/i18n';
import { FeatureGate } from '@/shared/ui';

export function StaySetupRoomStep() {
  const t = useTranslations('pages.staySetup.room');

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
      </div>
      <FeatureGate module="roomMap">
        <FindYourBedPanel />
      </FeatureGate>
    </div>
  );
}
