'use client';

import { useTranslations } from '@/shared/i18n';
import { useHostelConfig, useModuleStatus } from '@/entities/tenant';
import { shouldShowTimedGuestBanner } from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { FeatureGate } from '@/shared/ui';
import { useArrivalAccessPlan } from '../lib/useArrivalAccessPlan';
import { AccessStepsCarousel } from './AccessStepsCarousel';
import { ArrivalBanner } from './ArrivalBanner';

function NightCodesOnly() {
  const doors = useTranslations('domains.hostel.enter.doors');
  const privateT = useTranslations('domains.hostel.inside.private');
  const plan = useArrivalAccessPlan();

  const codedSteps = plan.nightAccess?.steps.filter((step) => step.code) ?? [];
  const guideKey = plan.nightAccess?.steps.find((step) => step.guideKey)?.guideKey;

  if (codedSteps.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <div className={`grid gap-3 ${codedSteps.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {codedSteps.map((step) => (
          <div key={step.id} className="space-y-1">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {step.label}
            </p>
            <p className="font-mono text-sm font-bold">{step.code}</p>
          </div>
        ))}
      </div>
      {guideKey && <p className="text-xs text-muted-foreground">{doors(guideKey)}</p>}
    </div>
  );
}

export function NightReturnSection() {
  const doors = useTranslations('domains.hostel.enter.doors');
  const sectionT = useTranslations('pages.arrivalJourney.arrival.sections');
  const doorPhotosStatus = useModuleStatus('doorPhotos');
  const hostel = useHostelConfig();
  const plan = useArrivalAccessPlan();

  if (!plan.nightAccess) return null;

  const { banner, steps, hasAnyCode } = plan.nightAccess;
  const stepsWithPhotos = steps.filter((step) => step.imageSrc);

  const body = (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{sectionT('night.heading')}</h3>
      {shouldShowTimedGuestBanner(hostel.selfCheckInTimeAfter) ? (
        <ArrivalBanner variant="night" keys={banner} checkInTime={hostel.selfCheckInTimeAfter ?? ''} />
      ) : null}
      {stepsWithPhotos.length > 0 && doorPhotosStatus !== 'hidden' && (
        <AccessStepsCarousel steps={stepsWithPhotos} />
      )}
      {stepsWithPhotos.length === 0 && hasAnyCode && <NightCodesOnly />}
      {!hasAnyCode && stepsWithPhotos.length === 0 && (
        <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {doors('noCodeHint')}
        </p>
      )}
    </section>
  );

  return (
    <FeatureGate module="doorAccess" showPreviewBadge={false}>
      {body}
    </FeatureGate>
  );
}
