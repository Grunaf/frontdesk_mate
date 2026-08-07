/**
 * Reception Plan sticky stack: header chrome → tool panel (content) → day headers.
 * z-stack: table left sticky z-10 < day header sticky z-[15] < sticky bars z-20 < bottom nav z-30 < dialogs.
 */
export const RECEPTION_STICKY_CHROME_Z = 'z-20';

/** Surface for desk header sticky chrome (blur, opaque enough that content does not bleed). */
export const RECEPTION_STICKY_CHROME_SURFACE =
  'border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90';

/**
 * Plan tool panel surface: content-side sticky bar (no chrome blur).
 * Opaque so calendar cells do not show through while stuck.
 */
export const RECEPTION_PLAN_TOOLBAR_SURFACE =
  'border-border/60 bg-[color-mix(in_oklab,var(--muted)_30%,var(--background))]';

/** Measured desk header sticky height (px) on `:root`. */
export const RECEPTION_STICKY_HEADER_HEIGHT_VAR = '--reception-sticky-header-height';

/** Measured Plan tool panel sticky height (px) on `:root`. */
export const RECEPTION_STICKY_TOOLBAR_HEIGHT_VAR = '--reception-sticky-toolbar-height';

/** @deprecated Alias — header-only height (was header+toolbar). */
export const RECEPTION_STICKY_CHROME_HEIGHT_VAR = RECEPTION_STICKY_HEADER_HEIGHT_VAR;

/** Tool panel sticks flush under measured header. */
export const RECEPTION_PLAN_TOOLBAR_STICKY_TOP =
  'top-[var(--reception-sticky-header-height,3.75rem)]';

/**
 * Day header row sticks under header + tool panel.
 * Top air on day cells comes from their own `pt` (same before and while stuck).
 */
export const RECEPTION_PLAN_DAY_HEADER_STICKY_TOP =
  'top-[calc(var(--reception-sticky-header-height,3.75rem)+var(--reception-sticky-toolbar-height,2.75rem))]';
