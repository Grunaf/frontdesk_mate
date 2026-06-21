'use client';

import { useTranslations } from '@/shared/i18n';
import { useModuleStatus } from '@/entities/tenant';
import { FeatureGate } from '@/shared/ui';
import { useArrivalAccessPlan } from '../lib/useArrivalAccessPlan';
import { ArrivalBanner } from './ArrivalBanner';
import { ImageLandmark } from './ImageLandmark';

const LANDMARK_BANNER = {
  titleKey: 'sections.find.title',
  bannerKey: 'sections.find.banner',
  hasIcon: false,
} as const;

export function FindHostelSection() {
  const t = useTranslations('pages.arrivalJourney.arrival.sections');
  const doorPhotosStatus = useModuleStatus('doorPhotos');
  const plan = useArrivalAccessPlan();

  if (!plan.landmark) return null;

  const content = (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t('find.heading')}</h3>
      <ArrivalBanner variant="landmark" keys={LANDMARK_BANNER} />
      <ImageLandmark src={plan.landmark.imageSrc} alt={plan.landmark.imageAlt} />
    </section>
  );

  if (doorPhotosStatus === 'hidden') {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('find.heading')}</h3>
        <ArrivalBanner variant="landmark" keys={LANDMARK_BANNER} />
        <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {t('find.photosHiddenHint')}
        </p>
      </section>
    );
  }

  return (
    <FeatureGate module="doorPhotos" showPreviewBadge={false}>
      {content}
    </FeatureGate>
  );
}
