'use client';

import { useRef, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { BottomSheetHeader, Button } from '@/shared/ui';
import { doorAccessSlideEnterClass } from '../lib/doorAccessSlideEnterClass';
import {
  DoorAccessSlideProgress,
  type DoorAccessSlideProgressProps,
  usePrefersReducedMotion,
} from './DoorAccessSlideProgress';

const SWIPE_MIN_DISTANCE_PX = 48;

export type DoorAccessSlideDockCode = {
  label: string;
  value: string;
};

export type DoorAccessSlideDockProgress = DoorAccessSlideProgressProps;

export type DoorAccessSlideDockIconAction = {
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
};

export type DoorAccessSlideDockFooterAction =
  | {
      variant: 'primary';
      label: string;
      onClick: () => void;
      disabled?: boolean;
      back?: DoorAccessSlideDockIconAction;
    }
  | {
      variant: 'slideNav';
      back?: DoorAccessSlideDockIconAction;
      forward?: DoorAccessSlideDockIconAction;
    };

export interface DoorAccessSlideDockProps {
  title: string;
  body: string | null;
  code?: DoorAccessSlideDockCode | null;
  progress?: DoorAccessSlideDockProgress;
  footerAction?: DoorAccessSlideDockFooterAction;
  /** Finger swipe left → next slide. */
  onSwipeNext?: () => void;
  /** Finger swipe right → previous slide. */
  onSwipePrev?: () => void;
  contentTransitionKey?: string;
  slideDirection?: 1 | -1;
  className?: string;
}

function SlideNavIconButton({
  direction,
  action,
}: {
  direction: 'back' | 'forward';
  action: DoorAccessSlideDockIconAction;
}) {
  const Icon = direction === 'back' ? ChevronLeft : ChevronRight;

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-lg"
      className="rounded-full border border-border bg-background shadow-sm hover:bg-muted/60"
      aria-label={action.ariaLabel}
      onClick={action.onClick}
      disabled={action.disabled}
    >
      <Icon className="size-6" aria-hidden />
    </Button>
  );
}

export function DoorAccessSlideDock({
  title,
  body,
  code = null,
  progress,
  footerAction,
  onSwipeNext,
  onSwipePrev,
  contentTransitionKey = 'slide-content',
  slideDirection = 1,
  className,
}: DoorAccessSlideDockProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasBodySection = Boolean(body || code);
  const hasFooter = Boolean(footerAction);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      onSwipeNext?.();
      return;
    }

    onSwipePrev?.();
  };

  return (
    <div
      className={cn(
        'relative touch-pan-y rounded-t-2xl border bg-popover text-popover-foreground shadow-lg',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        key={contentTransitionKey}
        className={doorAccessSlideEnterClass(slideDirection, prefersReducedMotion)}
      >
        {progress ? (
          <DoorAccessSlideProgress
            count={progress.count}
            activeIndex={progress.activeIndex}
            placement="top"
          />
        ) : null}

        <BottomSheetHeader className={cn('px-6 pb-2', progress ? 'pt-0' : 'pt-3')}>
          <h3 className="text-base font-semibold leading-snug text-foreground">{title}</h3>
        </BottomSheetHeader>

        {hasBodySection ? (
          <div
            className={cn(
              'space-y-3 px-6 pt-0',
              hasFooter ? 'pb-4' : 'pb-0'
            )}
          >
            {body ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            ) : null}

            {code ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {code.label}
                </span>
                <span className="font-mono text-sm font-bold tracking-wider text-primary">
                  {code.value}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {!hasBodySection && !hasFooter ? <div className="pb-4" aria-hidden="true" /> : null}
      </div>

      {footerAction?.variant === 'primary' ? (
        <div
          className={cn(
            'flex items-center gap-3 px-6 pb-5',
            hasBodySection ? 'pt-0' : 'pt-4'
          )}
        >
          {footerAction.back ? (
            <SlideNavIconButton direction="back" action={footerAction.back} />
          ) : null}
          <Button
            size="lg"
            className={cn('min-w-0', footerAction.back ? 'flex-1' : 'w-full')}
            onClick={footerAction.onClick}
            disabled={footerAction.disabled}
          >
            {footerAction.label}
          </Button>
        </div>
      ) : null}

      {footerAction?.variant === 'slideNav' ? (
        <div
          className={cn(
            'flex items-center justify-between px-6 pb-5',
            hasBodySection ? 'pt-0' : 'pt-4'
          )}
        >
          {footerAction.back ? (
            <SlideNavIconButton direction="back" action={footerAction.back} />
          ) : (
            <div className="size-12 shrink-0" aria-hidden />
          )}
          {footerAction.forward ? (
            <SlideNavIconButton direction="forward" action={footerAction.forward} />
          ) : (
            <div className="size-12 shrink-0" aria-hidden />
          )}
        </div>
      ) : null}
    </div>
  );
}
