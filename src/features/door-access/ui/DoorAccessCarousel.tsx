'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ArrivalBannerKeys } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { FeatureGate } from '@/shared/ui';
import type {
  DoorAccessDoorsMessage,
  DoorAccessEnterMessage,
  DoorAccessSlide,
} from '../lib/buildDoorAccessSlides';
import { doorAccessSlideEnterClass } from '../lib/doorAccessSlideEnterClass';
import { DoorAccessStageLayout } from './DoorAccessStageLayout';
import {
  DoorAccessSlideDock,
  type DoorAccessSlideDockCode,
  type DoorAccessSlideDockFooterAction,
} from './DoorAccessSlideDock';
import { usePrefersReducedMotion } from './DoorAccessSlideProgress';

export type DoorAccessPrimaryAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export type DoorAccessSlideView = DoorAccessSlide;

/** @deprecated Section copy lives on slide `sheet`; pass `null` only. */
export interface DoorAccessCarouselAccessBanner {
  variant: 'day' | 'night';
  keys: ArrivalBannerKeys;
  checkInTime?: string;
}

export interface DoorAccessCarouselProps {
  slides: DoorAccessSlideView[];
  /** @deprecated Ignored; use per-slide `sheet` from `buildDoorAccessSlides`. */
  accessBanner?: DoorAccessCarouselAccessBanner | null;
  showSlideCounter?: boolean;
  /** @deprecated Labels are shown in the slide dock title. */
  showSlideLabels?: boolean;
  /** Landmark slides → `doorPhotos`; access slides → `doorAccess` (matches pre-carousel sections). */
  useModuleGates?: boolean;
  primaryAction?: DoorAccessPrimaryAction;
  /** Slide changes only via dock footer; media is not horizontally scrollable. */
  navigateViaSheetOnly?: boolean;
  /** Rendered over the top of the photo (e.g. arrival guide chips). */
  mediaTopOverlay?: ReactNode;
}

function slideKey(slide: DoorAccessSlideView): string {
  if (slide.kind === 'landmark') return 'landmark';
  return slide.step.id;
}

function resolveEnterMessage(
  message: DoorAccessEnterMessage,
  enter: ReturnType<typeof useTranslations<'domains.hostel.enter'>>
): string {
  return message.params ? enter(message.key, message.params) : enter(message.key);
}

function resolveDoorsMessage(
  message: DoorAccessDoorsMessage,
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>
): string {
  return message.params ? doors(message.key, message.params) : doors(message.key);
}

function resolveSheetTitle(
  slide: DoorAccessSlideView,
  enter: ReturnType<typeof useTranslations<'domains.hostel.enter'>>,
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>
): string {
  const { sheetTitle, sheetContext } = slide.sheet;
  if ('literal' in sheetTitle) {
    return sheetTitle.literal;
  }
  if (sheetContext === 'landmark' || sheetContext === 'firstAccess') {
    return resolveEnterMessage(sheetTitle, enter);
  }
  return resolveDoorsMessage(sheetTitle, doors);
}

function resolveSheetBody(
  slide: DoorAccessSlideView,
  enter: ReturnType<typeof useTranslations<'domains.hostel.enter'>>,
  doors: ReturnType<typeof useTranslations<'domains.hostel.enter.doors'>>
): string | null {
  const { sheetBody, sheetContext } = slide.sheet;
  if (!sheetBody) {
    return null;
  }
  if ('literal' in sheetBody) {
    return sheetBody.literal;
  }
  if (sheetContext === 'landmark' || sheetContext === 'firstAccess') {
    return resolveEnterMessage(sheetBody, enter);
  }
  return resolveDoorsMessage(sheetBody, doors);
}

function resolveSlideCode(slide: DoorAccessSlideView): DoorAccessSlideDockCode | null {
  if (slide.kind !== 'access') {
    return null;
  }
  const { step } = slide;
  if (step.showCode && step.code) {
    return { label: step.label, value: step.code };
  }
  return null;
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
  useModuleGates,
}: {
  slide: DoorAccessSlideView;
  useModuleGates: boolean;
}) {
  return (
    <ModuleGatedSlide slide={slide} useModuleGates={useModuleGates}>
      {slide.kind === 'landmark' && (
        <div className="relative h-full w-full bg-muted">
          <img
            src={slide.landmark.imageSrc}
            alt={slide.landmark.imageAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {slide.kind === 'access' && slide.media === 'photo' && slide.step.imageSrc && (
        <div className="relative h-full w-full bg-muted">
          <img
            src={slide.step.imageSrc}
            alt={slide.step.imageAlt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {slide.kind === 'access' && slide.media === 'text' && (
        <div className="h-full w-full bg-muted/40" aria-hidden="true" />
      )}
    </ModuleGatedSlide>
  );
}

export function DoorAccessCarousel({
  slides,
  accessBanner: _accessBanner = null,
  showSlideCounter: _showSlideCounter = true,
  showSlideLabels: _showSlideLabels = true,
  useModuleGates = false,
  primaryAction,
  navigateViaSheetOnly = false,
  mediaTopOverlay,
}: DoorAccessCarouselProps) {
  const enter = useTranslations('domains.hostel.enter');
  const doors = useTranslations('domains.hostel.enter.doors');
  const arrival = useTranslations('pages.arrivalJourney.arrival');
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideDirectionRef = useRef<1 | -1>(1);
  const prefersReducedMotion = usePrefersReducedMotion();
  const slideCount = slides.length;

  useEffect(() => {
    setActiveIndex((current) => {
      if (slideCount <= 0) {
        return 0;
      }
      return Math.min(Math.max(current, 0), slideCount - 1);
    });
  }, [slideCount]);

  const goToNextSlide = useCallback(() => {
    slideDirectionRef.current = 1;
    setActiveIndex((current) => {
      const next = Math.min(current + 1, slideCount - 1);
      if (!navigateViaSheetOnly && scrollRef.current && slideCount > 0) {
        const width = scrollRef.current.offsetWidth;
        if (width > 0) {
          scrollRef.current.scrollTo({ left: width * next, behavior: 'smooth' });
        }
      }
      return next;
    });
  }, [navigateViaSheetOnly, slideCount]);

  const goToPrevSlide = useCallback(() => {
    slideDirectionRef.current = -1;
    setActiveIndex((current) => {
      const prev = Math.max(current - 1, 0);
      if (!navigateViaSheetOnly && scrollRef.current && slideCount > 0) {
        const width = scrollRef.current.offsetWidth;
        if (width > 0) {
          scrollRef.current.scrollTo({ left: width * prev, behavior: 'smooth' });
        }
      }
      return prev;
    });
  }, [navigateViaSheetOnly, slideCount]);

  const handleScroll = () => {
    if (navigateViaSheetOnly || !scrollRef.current || slides.length <= 1) return;
    const width = scrollRef.current.offsetWidth;
    if (width <= 0) return;
    const index = Math.round(scrollRef.current.scrollLeft / width);
    setActiveIndex(Math.min(Math.max(index, 0), slides.length - 1));
  };

  if (slides.length === 0) {
    return null;
  }

  const activeSlide = slides[activeIndex] ?? slides[0];
  const isLastSlide = activeIndex >= slides.length - 1;
  const isFirstSlide = activeIndex <= 0;
  const nextSlide = isLastSlide ? undefined : slides[activeIndex + 1];
  const prevSlide = isFirstSlide ? undefined : slides[activeIndex - 1];

  const dockTitle = resolveSheetTitle(activeSlide, enter, doors);
  const dockBody = resolveSheetBody(activeSlide, enter, doors);
  const dockCode = resolveSlideCode(activeSlide);

  const dockBackAction =
    !isFirstSlide && prevSlide
      ? {
          ariaLabel: resolveSheetTitle(prevSlide, enter, doors) || arrival('nextSlide'),
          onClick: goToPrevSlide,
        }
      : undefined;

  const footerAction = ((): DoorAccessSlideDockFooterAction | undefined => {
    if (!isLastSlide) {
      const forwardAria =
        (nextSlide && resolveSheetTitle(nextSlide, enter, doors)) || arrival('nextSlide');

      return {
        variant: 'slideNav',
        back: !isFirstSlide
          ? {
              ariaLabel:
                (prevSlide && resolveSheetTitle(prevSlide, enter, doors)) ||
                arrival('nextSlide'),
              onClick: goToPrevSlide,
            }
          : undefined,
        forward: {
          ariaLabel: forwardAria,
          onClick: goToNextSlide,
        },
      };
    }
    if (!primaryAction) {
      return undefined;
    }
    if (activeSlide.kind === 'access') {
      return {
        variant: 'primary',
        label: primaryAction.label,
        onClick: primaryAction.onClick,
        disabled: primaryAction.disabled,
        back: dockBackAction,
      };
    }
    if (slides.length === 1 && activeSlide.kind === 'landmark') {
      return {
        variant: 'primary',
        label: primaryAction.label,
        onClick: primaryAction.onClick,
        disabled: primaryAction.disabled,
        back: dockBackAction,
      };
    }
    return undefined;
  })();

  const mediaEnterClass = doorAccessSlideEnterClass(
    slideDirectionRef.current,
    prefersReducedMotion
  );

  const media = navigateViaSheetOnly ? (
    <div className="h-full w-full overflow-hidden">
      <div
        key={slideKey(activeSlide)}
        className={cn('h-full w-full', mediaEnterClass)}
      >
        <SlideFrame slide={activeSlide} useModuleGates={useModuleGates} />
      </div>
    </div>
  ) : (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {slides.map((slide) => (
        <div key={slideKey(slide)} className="h-full w-full shrink-0 snap-center">
          <SlideFrame slide={slide} useModuleGates={useModuleGates} />
        </div>
      ))}
    </div>
  );

  const sheet = (
    <DoorAccessSlideDock
      title={dockTitle}
      body={dockBody}
      code={dockCode}
      progress={{
        count: slides.length,
        activeIndex,
      }}
      footerAction={footerAction}
      onSwipeNext={!isLastSlide ? goToNextSlide : undefined}
      onSwipePrev={!isFirstSlide ? goToPrevSlide : undefined}
      contentTransitionKey={slideKey(activeSlide)}
      slideDirection={slideDirectionRef.current}
    />
  );

  return (
    <DoorAccessStageLayout
      media={media}
      mediaTopOverlay={mediaTopOverlay}
      sheet={sheet}
    />
  );
}
