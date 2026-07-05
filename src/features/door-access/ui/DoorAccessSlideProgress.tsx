'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';

const SEGMENT_GAP_PX = 8;
const MAX_SEGMENT_PX = 40;
const MIN_SEGMENT_PX = 24;
const MAX_TRACK_PX = 280;
const INACTIVE_DOT_PX = 6;
const ACTIVE_BAR_HEIGHT_PX = 4;

export type DoorAccessSlideProgressProps = {
  count: number;
  activeIndex: number;
};

function resolveActiveBarWidthPx(count: number): number {
  if (count <= 1) {
    return 0;
  }
  const available = MAX_TRACK_PX - (count - 1) * SEGMENT_GAP_PX;
  return Math.min(MAX_SEGMENT_PX, Math.max(MIN_SEGMENT_PX, available / count)) / 2;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setPrefersReducedMotion(media.matches);
    };

    update();
    media.addEventListener('change', update);

    return () => {
      media.removeEventListener('change', update);
    };
  }, []);

  return prefersReducedMotion;
}

export function DoorAccessSlideProgress({
  count,
  activeIndex,
}: DoorAccessSlideProgressProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (count <= 1) {
    return null;
  }

  const activeBarWidthPx = resolveActiveBarWidthPx(count);

  return (
    <div
      className="flex justify-center px-6 pb-3 pt-3"
      role="group"
      aria-label={`Slide ${activeIndex + 1} of ${count}`}
    >
      <div className="flex items-center" style={{ gap: SEGMENT_GAP_PX }}>
        {Array.from({ length: count }, (_, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={index}
              aria-hidden={!isActive}
              className={cn(
                'shrink-0 rounded-full',
                isActive ? 'bg-muted-foreground/45' : 'bg-muted-foreground/25',
                !prefersReducedMotion &&
                  'transition-[width,height,transform,opacity] duration-300 ease-out',
                !isActive && !prefersReducedMotion && 'scale-90'
              )}
              style={{
                width: isActive ? activeBarWidthPx : INACTIVE_DOT_PX,
                height: isActive ? ACTIVE_BAR_HEIGHT_PX : INACTIVE_DOT_PX,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
