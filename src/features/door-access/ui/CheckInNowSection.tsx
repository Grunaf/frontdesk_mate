'use client';

import { useTranslations } from '@/shared/i18n';
import { useModuleStatus } from '@/entities/tenant';
import { FeatureGate } from '@/shared/ui';
import { useArrivalAccessPlan } from '../lib/useArrivalAccessPlan';
import { AccessStepsCarousel } from './AccessStepsCarousel';
import { ArrivalBanner } from './ArrivalBanner';

export function CheckInNowSection() {
  const doors = useTranslations('domains.hostel.enter.doors');
  const t = useTranslations('pages.arrivalJourney.arrival.sections');
  const doorPhotosStatus = useModuleStatus('doorPhotos');
  const plan = useArrivalAccessPlan();

  if (!plan.dayAccess) return null;

  const { banner, steps } = plan.dayAccess;
  const stepsWithPhotos = steps.filter((step) => step.imageSrc);
  const guideOnlySteps = steps.filter((step) => !step.imageSrc && step.guideKey);

  const body = (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{t('checkIn.heading')}</h3>
      <ArrivalBanner variant="day" keys={banner} />
      {stepsWithPhotos.length > 0 && <AccessStepsCarousel steps={stepsWithPhotos} />}
      {guideOnlySteps.map((step) =>
        step.guideKey ? (
          <p key={step.id} className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            {doors(step.guideKey)}
          </p>
        ) : null
      )}
      {stepsWithPhotos.length === 0 && guideOnlySteps.length === 0 && (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {doors('emptyState')}
        </p>
      )}
    </section>
  );

  if (doorPhotosStatus === 'hidden' && stepsWithPhotos.length > 0) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('checkIn.heading')}</h3>
        <ArrivalBanner variant="day" keys={banner} />
        <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {doors('photosOnlyHint')}
        </p>
      </section>
    );
  }

  return (
    <FeatureGate module="doorAccess" showPreviewBadge={false}>
      {body}
    </FeatureGate>
  );
}
