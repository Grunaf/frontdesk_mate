/** Viewport height at or below which the concierge reception strip uses compact layout. */
export const CONCIERGE_SHORT_VIEWPORT_MAX_HEIGHT_PX = 520;

/** Fixed reception strip at the bottom of the guest shell (max-w-md). */
export const conciergeReceptionStripFixedClass =
  'fixed bottom-0 left-1/2 z-10 w-full max-w-md min-w-0 -translate-x-1/2 border-t border-border/80 bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/90 short-viewport:pt-2 short-viewport:pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]';

/** Reserve space so scrollable concierge content is not hidden under the fixed strip. */
export const conciergeContentStripOffsetClass =
  'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] short-viewport:pb-[calc(4rem+env(safe-area-inset-bottom,0px))]';
