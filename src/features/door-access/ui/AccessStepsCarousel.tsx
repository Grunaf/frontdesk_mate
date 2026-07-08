'use client';

import type { ArrivalAccessStep } from '@/entities/tenant';
import type { DoorAccessSlide } from '../lib/buildDoorAccessSlides';
import { DoorAccessCarousel } from './DoorAccessCarousel';

interface AccessStepsCarouselProps {
  steps: ArrivalAccessStep[];
  showStepLabels?: boolean;
}

/** @deprecated Prefer `DoorAccessCarousel` with `buildDoorAccessSlides` slides. */
export function AccessStepsCarousel({ steps, showStepLabels = true }: AccessStepsCarouselProps) {
  const slides: DoorAccessSlide[] = steps
    .filter((step) => step.imageSrc)
    .map((step) => ({
      kind: 'access' as const,
      step,
      media: 'photo' as const,
      sheet: {
        sheetContext: 'access' as const,
        sheetTitle: step.label.trim() ? { literal: step.label } : { key: step.titleKey },
        sheetBody: step.guideKey ? { key: step.guideKey } : null,
      },
    }));

  return (
    <DoorAccessCarousel slides={slides} showSlideLabels={showStepLabels} accessBanner={null} />
  );
}
