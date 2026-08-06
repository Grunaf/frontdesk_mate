/**
 * Reception sticky chrome (single stack: header → tabs → Plan calendar bar).
 * z-stack: table left sticky z-10 < day header sticky z-[15] < top chrome z-20 < bottom nav z-30 < dialogs.
 */
export const RECEPTION_STICKY_CHROME_Z = 'z-20';

/** Surface match for fixed bottom nav — opaque enough that scrolling content does not bleed through. */
export const RECEPTION_STICKY_CHROME_SURFACE =
  'border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90';

/** Mount point inside the sticky stack for Plan calendar controls (portal target). */
export const RECEPTION_PLAN_TOOLBAR_SLOT_ID = 'reception-plan-calendar-toolbar-slot';

/** Set on `:root` from measured Plan sticky chrome height (px). */
export const RECEPTION_STICKY_CHROME_HEIGHT_VAR = '--reception-sticky-chrome-height';

/**
 * Day header row sticks flush under measured sticky chrome.
 * Top air comes only from header `pt` (same before and while stuck).
 * Fallback approx. when the CSS var is not set yet.
 */
export const RECEPTION_PLAN_DAY_HEADER_STICKY_TOP =
  'top-[var(--reception-sticky-chrome-height,7.25rem)]';
