'use client';

import type { ArrivalAccessStep } from '@/entities/tenant';
import { DoorAccessCarousel } from './DoorAccessCarousel';

interface AccessStepsCarouselProps {
  steps: ArrivalAccessStep[];
  showStepLabels?: boolean;
}

/** @deprecated Prefer `DoorAccessCarousel` with `buildDoorAccessSlides` slides. */
export function AccessStepsCarousel({ steps, showStepLabels = true }: AccessStepsCarouselProps) {
  const slides = steps
    .filter((step) => step.imageSrc)
    .map((step) => ({ kind: 'access' as const, step, media: 'photo' as const }));

  return (
    <DoorAccessCarousel slides={slides} showSlideLabels={showStepLabels} accessBanner={null} />
  );
}
