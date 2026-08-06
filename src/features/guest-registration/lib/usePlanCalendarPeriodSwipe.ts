'use client';

import {
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';

/** Min horizontal travel before a period change commits. */
const MIN_DISTANCE_PX = 56;
/** Horizontal must dominate vertical by this ratio (direction lock). */
const DIRECTION_RATIO = 2;
/** Ignore tiny jitter before deciding axis. */
const AXIS_DECIDE_PX = 10;

const STICKY_SELECTOR = '[data-plan-calendar-sticky]';

type AxisLock = 'horizontal' | 'vertical';

type Tracking = {
  pointerId: number;
  startX: number;
  startY: number;
  axis: AxisLock | null;
};

export type PlanCalendarPeriodSwipeBindProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void;
};

/**
 * Horizontal swipe on the Plan calendar grid → prev/next period (Google Calendar style).
 * Vertical scroll stays with the browser; sticky bed column starts are ignored.
 */
export function usePlanCalendarPeriodSwipe(options: {
  enabled: boolean;
  onShift: (direction: -1 | 1) => void;
}): PlanCalendarPeriodSwipeBindProps {
  const trackingRef = useRef<Tracking | null>(null);
  const suppressClickRef = useRef(false);
  const enabledRef = useRef(options.enabled);
  const onShiftRef = useRef(options.onShift);
  enabledRef.current = options.enabled;
  onShiftRef.current = options.onShift;

  const clearTracking = useCallback((target?: HTMLElement | null, pointerId?: number) => {
    const tracking = trackingRef.current;
    if (tracking && target && pointerId != null && target.hasPointerCapture?.(pointerId)) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
    }
    trackingRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabledRef.current) return;
      if (!event.isPrimary) return;
      if (event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(STICKY_SELECTOR)) return;
      if (target.closest('select')) return;

      suppressClickRef.current = false;
      trackingRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        axis: null,
      };
    },
    []
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const tracking = trackingRef.current;
      if (!tracking || tracking.pointerId !== event.pointerId) return;

      const dx = event.clientX - tracking.startX;
      const dy = event.clientY - tracking.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (tracking.axis == null) {
        if (absDx < AXIS_DECIDE_PX && absDy < AXIS_DECIDE_PX) return;

        if (absDy * DIRECTION_RATIO >= absDx) {
          trackingRef.current = null;
          return;
        }

        tracking.axis = 'horizontal';
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* capture optional */
        }
      }

      if (tracking.axis === 'horizontal') {
        event.preventDefault();
      }
    },
    []
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const tracking = trackingRef.current;
      if (!tracking || tracking.pointerId !== event.pointerId) return;

      const dx = event.clientX - tracking.startX;
      const committed =
        tracking.axis === 'horizontal' && Math.abs(dx) >= MIN_DISTANCE_PX && enabledRef.current;

      clearTracking(event.currentTarget, event.pointerId);

      if (!committed) return;

      suppressClickRef.current = true;
      // Finger moved left → next period; right → previous (calendar convention).
      onShiftRef.current(dx < 0 ? 1 : -1);
    },
    [clearTracking]
  );

  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onClickCapture,
  };
}
