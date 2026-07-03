'use client';

import { useRef, useState } from 'react';
import type { ArrivalAccessStep } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { ImageLandmark } from './ImageLandmark';

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

interface AccessStepsCarouselProps {
  steps: ArrivalAccessStep[];
  showStepLabels?: boolean;
}

export function AccessStepsCarousel({ steps, showStepLabels = true }: AccessStepsCarouselProps) {
  const doors = useTranslations('domains.hostel.enter.doors');
  const [activePhoto, setActivePhoto] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleSteps = steps.filter((step) => step.imageSrc);

  const handleScroll = () => {
    if (!scrollRef.current || visibleSteps.length <= 1) return;
    const width = scrollRef.current.offsetWidth;
    const scrollLeft = scrollRef.current.scrollLeft;
    const index = Math.round(scrollLeft / (width * 0.85));
    setActivePhoto(index);
  };

  if (visibleSteps.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {visibleSteps.length > 1 && (
        <div className="flex justify-end">
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground uppercase">
            {activePhoto + 1} / {visibleSteps.length}
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {visibleSteps.map((slide, index) => {
          const isActive = activePhoto === index;

          return (
            <div
              key={slide.id}
              className="w-[85%] shrink-0 origin-center transform snap-center transition-all duration-300"
            >
              <div
                className={`space-y-2 transition-all duration-300 ${isActive ? 'scale-100' : 'scale-95 opacity-60'}`}
              >
                {showStepLabels && (
                  <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    {slide.label}
                  </p>
                )}

                <div className="group relative overflow-hidden rounded-xl">
                  <ImageLandmark src={slide.imageSrc!} alt={slide.imageAlt} />
                  {isActive && <SlideGuide slide={slide} doors={doors} />}
                  <SlideCode slide={slide} doors={doors} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
