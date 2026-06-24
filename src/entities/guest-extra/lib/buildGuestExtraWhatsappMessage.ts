import type { GuestExtraPresetId } from '../model/types';

type GuestExtraMessageKey =
  | 'laundryMessage'
  | 'earlyCheckinMessage'
  | 'lateCheckoutMessage'
  | 'partnerTransferMessage'
  | 'partnerTourMessage'
  | 'partnerGuideMessage';

const MESSAGE_KEY_BY_PRESET: Record<GuestExtraPresetId, GuestExtraMessageKey> = {
  laundry: 'laundryMessage',
  early_checkin: 'earlyCheckinMessage',
  late_checkout: 'lateCheckoutMessage',
  partner_transfer: 'partnerTransferMessage',
  partner_tour: 'partnerTourMessage',
  partner_guide: 'partnerGuideMessage',
};

export function buildGuestExtraWhatsappMessage(input: {
  presetId: GuestExtraPresetId;
  hostelName: string;
  bedLabel: string;
  stayRef: string | null;
  checkoutTime?: string;
  composeMessage: (
    key: GuestExtraMessageKey,
    values: {
      hostelName: string;
      bedLabel: string;
      stayRef: string;
      checkoutTime?: string;
    }
  ) => string;
}): string {
  const key = MESSAGE_KEY_BY_PRESET[input.presetId];
  const stayRef = input.stayRef ?? '—';
  const bedLabel = input.bedLabel || '—';

  return input.composeMessage(key, {
    hostelName: input.hostelName,
    bedLabel,
    stayRef,
    checkoutTime: input.checkoutTime,
  });
}
