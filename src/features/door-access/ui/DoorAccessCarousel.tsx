'use client';

import { useRef, useState, type ReactNode } from 'react';
import type { ArrivalAccessStep, ArrivalBannerKeys } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { FeatureGate } from '@/shared/ui';
import type { DoorAccessSlide } from '../lib/buildDoorAccessSlides';
import { ArrivalBanner } from './ArrivalBanner';
import { ImageLandmark } from './ImageLandmark';

export type DoorAccessSlideView = DoorAccessSlide;

function SlideGuide({
  slide,
  doors,
}: {
  slide: ArrivalAccessStep;
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>;
}) {
  if (!slide.guideKey) return null;

  return (
    <div className="animate-fade-in absolute top-3 right-3 left-3 z-10 rounded-lg border border-border/40 bg-foreground/80 p-2.5 text-sm leading-relaxed text-background backdrop-blur-md">
      <p>{doors(slide.guideKey)}</p>
    </div>
  );
}

function SlideCode({
  slide,
  doors,
}: {
  slide: ArrivalAccessStep;
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>;
}) {
  if (slide.showCode && slide.code) {
    return (
      <div className="animate-fade-in absolute right-3 bottom-3 z-10 flex items-center gap-2 rounded-lg border border-border/40 bg-foreground/80 px-3 py-1.5 text-background shadow-lg backdrop-blur-md">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          {slide.label}
        </span>
        <span className="font-mono text-sm font-bold tracking-wider text-primary">{slide.code}</span>
      </div>
    );
  }

  if (slide.missingCode) {
    return (
      <div className="animate-fade-in absolute right-3 bottom-3 left-3 z-10 rounded-lg border border-border/40 bg-foreground/80 px-3 py-2 text-sm leading-relaxed text-background shadow-lg backdrop-blur-md">
        {doors('noCodeHint')}
      </div>
    );
  }

  return null;
}

function AccessTextPanel({
  step,
  doors,
}: {
  step: ArrivalAccessStep;
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>;
}) {
  const guideText = step.guideKey ? doors(step.guideKey) : null;

  return (
    <div className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-lg border bg-muted/30 p-4 shadow-inner">
      {guideText && (
        <p className="text-sm leading-relaxed text-muted-foreground">{guideText}</p>
      )}
      <SlideCode slide={step} doors={doors} />
    </div>
  );
}

export interface DoorAccessCarouselAccessBanner {
  variant: 'day' | 'night';
  keys: ArrivalBannerKeys;
  checkInTime?: string;
}

export interface DoorAccessCarouselProps {
  slides: DoorAccessSlideView[];
  /** When set, shown on each access slide; landmark slides always use their own banner. */
  accessBanner?: DoorAccessCarouselAccessBanner | null;
  showSlideLabels?: boolean;
  /** Landmark slides → `doorPhotos`; access slides → `doorAccess` (matches pre-carousel sections). */
  useModuleGates?: boolean;
}

function slideKey(slide: DoorAccessSlideView): string {
  if (slide.kind === 'landmark') return 'landmark';
  return slide.step.id;
}

function ModuleGatedSlide({
  slide,
  useModuleGates,
  children,
}: {
  slide: DoorAccessSlideView;
  useModuleGates: boolean;
  children: ReactNode;
}) {
  if (!useModuleGates) {
    return <>{children}</>;
  }

  if (slide.kind === 'landmark') {
    return (
      <FeatureGate module="doorPhotos" showPreviewBadge={false}>
        {children}
      </FeatureGate>
    );
  }

  return (
    <FeatureGate module="doorAccess" showPreviewBadge={false}>
      {children}
    </FeatureGate>
  );
}

function SlideFrame({
  slide,
  isActive,
  doors,
  accessBanner,
  showSlideLabels,
  useModuleGates,
}: {
  slide: DoorAccessSlideView;
  isActive: boolean;
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>;
  accessBanner: DoorAccessCarouselAccessBanner | null;
  showSlideLabels: boolean;
  useModuleGates: boolean;
}) {
  return (
    <ModuleGatedSlide slide={slide} useModuleGates={useModuleGates}>
      <div className="space-y-2">
        {slide.kind === 'access' && showSlideLabels && (
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {slide.step.label}
          </p>
        )}

        {slide.kind === 'landmark' && (
          <ArrivalBanner variant="landmark" keys={slide.banner} />
        )}

        {slide.kind === 'access' && accessBanner && (
          <ArrivalBanner
            variant={accessBanner.variant}
            keys={accessBanner.keys}
            checkInTime={accessBanner.checkInTime}
          />
        )}

        <div className="group relative overflow-hidden rounded-xl">
          {slide.kind === 'landmark' && (
            <ImageLandmark src={slide.landmark.imageSrc} alt={slide.landmark.imageAlt} />
          )}

          {slide.kind === 'access' && slide.media === 'photo' && slide.step.imageSrc && (
            <>
              <ImageLandmark src={slide.step.imageSrc} alt={slide.step.imageAlt} />
              {isActive && <SlideGuide slide={slide.step} doors={doors} />}
              <SlideCode slide={slide.step} doors={doors} />
            </>
          )}

          {slide.kind === 'access' && slide.media === 'text' && (
            <AccessTextPanel step={slide.step} doors={doors} />
          )}
        </div>
      </div>
    </ModuleGatedSlide>
  );
}

export function DoorAccessCarousel({
  slides,
  accessBanner = null,
  showSlideLabels = true,
  useModuleGates = false,
}: DoorAccessCarouselProps) {
  const doors = useTranslations('domains.hostel.enter.doors');
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current || slides.length <= 1) return;
    const width = scrollRef.current.offsetWidth;
    const scrollLeft = scrollRef.current.scrollLeft;
    const index = Math.round(scrollLeft / (width * 0.85));
    setActiveIndex(index);
  };

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {slides.length > 1 && (
        <div className="flex justify-end">
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground uppercase">
            {activeIndex + 1} / {slides.length}
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {slides.map((slide, index) => {
          const isActive = activeIndex === index;

          return (
            <div
              key={slideKey(slide)}
              className="w-[85%] shrink-0 origin-center transform snap-center transition-all duration-300"
            >
              <div
                className={`transition-all duration-300 ${isActive ? 'scale-100' : 'scale-95 opacity-60'}`}
              >
                <SlideFrame
                  slide={slide}
                  isActive={isActive}
                  doors={doors}
                  accessBanner={accessBanner}
                  showSlideLabels={showSlideLabels}
                  useModuleGates={useModuleGates}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
