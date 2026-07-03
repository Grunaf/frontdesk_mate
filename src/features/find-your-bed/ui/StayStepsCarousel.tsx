'use client';

import { useRef, useState } from 'react';
import type { GuestStayStep } from '@/entities/tenant';
import { ImageLandmark } from '@/features/door-access/ui/ImageLandmark';

interface StayStepsCarouselProps {
  steps: GuestStayStep[];
}

export function StayStepsCarousel({ steps }: StayStepsCarouselProps) {
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
        {visibleSteps.map((step, index) => {
          const isActive = activePhoto === index;

          return (
            <div
              key={step.id}
              className="w-[85%] shrink-0 origin-center transform snap-center transition-all duration-300"
            >
              <div
                className={`space-y-2 transition-all duration-300 ${isActive ? 'scale-100' : 'scale-95 opacity-60'}`}
              >
                <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {step.label}
                </p>

                <div className="group relative overflow-hidden rounded-xl">
                  <ImageLandmark src={step.imageSrc!} alt={step.label} />
                  {isActive && step.hint && (
                    <div className="animate-fade-in absolute top-3 right-3 left-3 z-10 rounded-lg border border-border/40 bg-foreground/80 p-2.5 text-sm leading-relaxed text-background backdrop-blur-md">
                      <p>{step.hint}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
