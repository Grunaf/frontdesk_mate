'use client';

import { useMemo } from 'react';
import { useHostelConfig, useModuleStatus } from '@/entities/tenant';
import { shouldShowTimedGuestBanner } from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { useNightMode } from '@/shared/lib';
import { useTranslations } from '@/shared/i18n';
import { FeatureGate } from '@/shared/ui';
import {
  buildDoorAccessSlides,
  DOOR_ACCESS_LANDMARK_BANNER,
} from '../lib/buildDoorAccessSlides';
import { useArrivalAccessPlan } from '../lib/useArrivalAccessPlan';
import { ArrivalBanner } from './ArrivalBanner';
import { DoorAccessCarousel } from './DoorAccessCarousel';

export function DoorAccessPanel() {
  const isNightMode = useNightMode();
  const plan = useArrivalAccessPlan();
  const hostel = useHostelConfig();
  const doorPhotosStatus = useModuleStatus('doorPhotos');
  const doorAccessStatus = useModuleStatus('doorAccess');
  const doors = useTranslations('domains.hostel.enter.doors');
  const sectionT = useTranslations('pages.arrivalJourney.arrival.sections');

  const hasContent =
    plan.landmark ||
    plan.dayAccess ||
    (plan.nightAccess?.hasAnyCode || plan.nightAccess?.steps.some((s) => s.imageSrc));

  const { slides: builtSlides, sectionBanner } = useMemo(
    () => buildDoorAccessSlides(plan, { isNightMode }),
    [plan, isNightMode]
  );

  const slides = useMemo(() => {
    let next = builtSlides;

    if (doorPhotosStatus === 'hidden') {
      next = next.filter((slide) => slide.kind !== 'landmark');
      next = next.filter(
        (slide) => !(slide.kind === 'access' && slide.media === 'photo')
      );
    }

    if (doorAccessStatus === 'hidden') {
      next = next.filter((slide) => slide.kind === 'landmark');
    }

    return next;
  }, [builtSlides, doorPhotosStatus, doorAccessStatus]);

  if (!hasContent) {
    return (
      <div className="space-y-6 pt-5">
        <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {doors('emptyState')}
        </p>
      </div>
    );
  }

  const hasPhotoAccessSlides = builtSlides.some(
    (slide) => slide.kind === 'access' && slide.media === 'photo'
  );

  const showLandmarkPhotosHidden =
    doorPhotosStatus === 'hidden' && Boolean(plan.landmark);

  if (!isNightMode && doorPhotosStatus === 'hidden' && hasPhotoAccessSlides && plan.dayAccess) {
    return (
      <div className="space-y-3 pt-5">
        {showLandmarkPhotosHidden && (
          <>
            <ArrivalBanner variant="landmark" keys={DOOR_ACCESS_LANDMARK_BANNER} />
            <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
              {sectionT('find.photosHiddenHint')}
            </p>
          </>
        )}
        <ArrivalBanner variant="day" keys={plan.dayAccess.banner} />
        <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {doors('photosOnlyHint')}
        </p>
      </div>
    );
  }

  const showTimedNightBanner =
    isNightMode &&
    sectionBanner &&
    shouldShowTimedGuestBanner(hostel.selfCheckInTimeAfter);

  const showDaySectionBanner = !isNightMode && Boolean(sectionBanner);

  const slidesEmpty = slides.length === 0;
  const nightNoAccessUi =
    isNightMode &&
    plan.nightAccess &&
    !plan.nightAccess.hasAnyCode &&
    !plan.nightAccess.steps.some((step) => step.imageSrc);

  const showAccessSection = Boolean(isNightMode ? plan.nightAccess : plan.dayAccess);

  return (
    <div className="space-y-3 pt-5">
      {showLandmarkPhotosHidden && (
        <>
          <ArrivalBanner variant="landmark" keys={DOOR_ACCESS_LANDMARK_BANNER} />
          <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
            {sectionT('find.photosHiddenHint')}
          </p>
        </>
      )}

      {showAccessSection && (
        <FeatureGate module="doorAccess" showPreviewBadge={false}>
          <div className="space-y-3">
            {showDaySectionBanner && sectionBanner && (
              <ArrivalBanner variant="day" keys={sectionBanner} />
            )}

            {showTimedNightBanner && sectionBanner && (
              <ArrivalBanner
                variant="night"
                keys={sectionBanner}
                checkInTime={hostel.selfCheckInTimeAfter ?? ''}
              />
            )}

            {slidesEmpty && nightNoAccessUi && (
              <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                {doors('noCodeHint')}
              </p>
            )}
          </div>
        </FeatureGate>
      )}

      {slides.length > 0 && (
        <DoorAccessCarousel slides={slides} accessBanner={null} useModuleGates />
      )}
    </div>
  );
}
