/**
 * Owner dashboard UI mode.
 *
 * When false (default): desktop-only — narrow viewports see a “open on a computer”
 * gate; the mobile-narrow frame classes below stay in code for a future re-enable.
 * When true: restore the previous mobile-friendly narrow frame (no viewport gate).
 */
export const OWNER_DASHBOARD_MOBILE_UI_ENABLED = false;

/** Tailwind `lg` — same breakpoint as the CSS gate (`max-lg` / `lg:`). */
export const OWNER_DASHBOARD_DESKTOP_MIN_WIDTH_PX = 1024;

/** Preserved mobile-narrow chrome (used when OWNER_DASHBOARD_MOBILE_UI_ENABLED). */
export const OWNER_DASHBOARD_MOBILE_FRAME = {
  headerInner: 'mx-auto flex max-w-lg items-start justify-between gap-4',
  main: 'mx-auto max-w-lg px-4 py-6 sm:py-8',
} as const;

/** Desktop chrome while mobile UI is disabled. */
export const OWNER_DASHBOARD_DESKTOP_FRAME = {
  headerInner: 'mx-auto flex max-w-5xl items-start justify-between gap-4',
  main: 'mx-auto max-w-5xl px-4 py-6 sm:py-8',
} as const;

export function getOwnerDashboardFrameClasses() {
  return OWNER_DASHBOARD_MOBILE_UI_ENABLED
    ? OWNER_DASHBOARD_MOBILE_FRAME
    : OWNER_DASHBOARD_DESKTOP_FRAME;
}
