/** Desktop header CTA (reception desk, EN only). */
export const RECEPTION_ISSUE_ACCESS_DESKTOP_CTA_LABEL = 'New booking';

/** Mobile FAB — icon-only; same action as desktop CTA. */
export const RECEPTION_ISSUE_ACCESS_FAB_ARIA_LABEL = 'New booking';

/** Move bed focus — exit via FAB slot (replaces New booking). */
export const RECEPTION_CANCEL_MOVE_FAB_ARIA_LABEL = 'Cancel move';

/** Mobile FAB anchor — above bottom nav, below bottom sheets (z-50). */
export const RECEPTION_ISSUE_ACCESS_FAB_POSITION_CLASS =
  'fixed z-40 right-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:hidden';

/** Cancel-move FAB — same corner; lower because bottom nav is hidden in focus mode. */
export const RECEPTION_CANCEL_MOVE_FAB_POSITION_CLASS =
  'fixed z-40 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] lg:bottom-6';
