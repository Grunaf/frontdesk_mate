'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { useHostelConfig, useModuleStatus } from '@/entities/tenant';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from '@/shared/i18n';
import { FeatureGate } from '@/shared/ui';
import { buildDoorAccessSlides } from '../lib/buildDoorAccessSlides';
import { useArrivalAccessPlan } from '../lib/useArrivalAccessPlan';
import { DoorAccessCarousel, type DoorAccessPrimaryAction } from './DoorAccessCarousel';

export type { DoorAccessPrimaryAction };

export interface DoorAccessPanelProps {
  primaryAction?: DoorAccessPrimaryAction;
  /** When true, arrival journey should hide the main step footer button. */
  onHideMainPrimaryChange?: (hide: boolean) => void;
  /** Shown over the top of door-access photos (arrival guide chips). */
  mediaTopOverlay?: ReactNode;
}

const mutedHintClassName =
  'rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground';

export function DoorAccessPanel({
  primaryAction,
  onHideMainPrimaryChange,
  mediaTopOverlay,
}: DoorAccessPanelProps) {
  const { plan, isNightMode } = useArrivalAccessPlan();
  const hostel = useHostelConfig();
  const doorPhotosStatus = useModuleStatus('doorPhotos');
  const doorAccessStatus = useModuleStatus('doorAccess');
  const doors = useTranslations('domains.hostel.enter.doors');
  const sectionT = useTranslations('pages.arrivalJourney.arrival.sections');

  const hasContent =
    plan.landmark ||
    plan.dayAccess ||
    (plan.nightAccess?.hasAnyCode ||
      plan.nightAccess?.steps.some((s) => s.imageSrc || s.guideNote));

  const builtSlides = useMemo(
    () =>
      buildDoorAccessSlides(plan, {
        isNightMode,
        checkInTime: hostel.reception.time.close,
      }).slides,
    [plan, isNightMode, hostel.reception.time.close]
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

  const hideMainPrimary = slides.length > 0;

  useEffect(() => {
    onHideMainPrimaryChange?.(hideMainPrimary);
  }, [hideMainPrimary, onHideMainPrimaryChange]);

  useEffect(() => {
    return () => {
      onHideMainPrimaryChange?.(false);
    };
  }, [onHideMainPrimaryChange]);

  if (!hasContent) {
    return (
      <div className="space-y-6">
        <p className={mutedHintClassName}>{doors('emptyState')}</p>
      </div>
    );
  }

  const hasPhotoAccessSlides = builtSlides.some(
    (slide) => slide.kind === 'access' && slide.media === 'photo'
  );

  const dayPhotosHiddenWithAccess =
    !isNightMode &&
    doorPhotosStatus === 'hidden' &&
    hasPhotoAccessSlides &&
    Boolean(plan.dayAccess);

  const showLandmarkPhotosHiddenHint =
    doorPhotosStatus === 'hidden' && Boolean(plan.landmark);

  const slidesEmpty = slides.length === 0;
  const nightNoAccessUi =
    isNightMode &&
    plan.nightAccess &&
    !plan.nightAccess.hasAnyCode &&
    !plan.nightAccess.steps.some((step) => step.imageSrc || step.guideNote);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {slides.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <DoorAccessCarousel
            slides={slides}
            useModuleGates
            primaryAction={primaryAction}
            navigateViaSheetOnly
            mediaTopOverlay={mediaTopOverlay}
          />
        </div>
      ) : mediaTopOverlay ? (
        <div className="shrink-0">{mediaTopOverlay}</div>
      ) : null}

      {slidesEmpty && showLandmarkPhotosHiddenHint ? (
        <p className={cn(mutedHintClassName, 'mx-4')}>{sectionT('find.photosHiddenHint')}</p>
      ) : null}

      {slidesEmpty && dayPhotosHiddenWithAccess ? (
        <p className={cn(mutedHintClassName, 'mx-4')}>{doors('photosOnlyHint')}</p>
      ) : null}

      {slidesEmpty && nightNoAccessUi ? (
        <FeatureGate module="doorAccess" showPreviewBadge={false}>
          <p className={cn(mutedHintClassName, 'mx-4')}>{doors('unlockedHint')}</p>
        </FeatureGate>
      ) : null}
    </div>
  );
}
