import type { GuestExtraPresetId } from '@/entities/guest-extra';

const PRESET_I18N_KEYS: Record<
  GuestExtraPresetId,
  | 'laundry'
  | 'earlyCheckin'
  | 'lateCheckout'
  | 'partnerTransfer'
  | 'partnerTour'
  | 'partnerGuide'
> = {
  laundry: 'laundry',
  early_checkin: 'earlyCheckin',
  late_checkout: 'lateCheckout',
  partner_transfer: 'partnerTransfer',
  partner_tour: 'partnerTour',
  partner_guide: 'partnerGuide',
};

export function guestExtraPresetI18nKey(presetId: GuestExtraPresetId) {
  return PRESET_I18N_KEYS[presetId];
}
