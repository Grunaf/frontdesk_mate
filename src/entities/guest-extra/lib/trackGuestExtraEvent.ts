export type GuestExtraAnalyticsEvent =
  | 'extras_tile_click'
  | 'extras_sheet_open'
  | 'extras_cta_reception'
  | 'extras_cta_whatsapp'
  | 'extras_cta_link';

export function trackGuestExtraEvent(
  event: GuestExtraAnalyticsEvent,
  payload?: Record<string, string>
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('fdm:guest-extra', {
      detail: { event, ...payload },
    })
  );
}
