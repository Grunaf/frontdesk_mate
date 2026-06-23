import type { GuestServiceId } from './resolveGuestServices';

type ServiceMessageKey =
  | 'laundryMessage'
  | 'lateCheckoutMessage';

export function buildServiceWhatsappMessage(input: {
  serviceId: GuestServiceId;
  hostelName: string;
  bedLabel: string;
  stayRef: string | null;
  checkoutTime?: string;
  composeMessage: (
    key: ServiceMessageKey,
    values: {
      hostelName: string;
      bedLabel: string;
      stayRef: string;
      checkoutTime?: string;
    }
  ) => string;
}): string {
  const stayRef = input.stayRef ?? '—';
  const bedLabel = input.bedLabel || '—';

  if (input.serviceId === 'late_checkout') {
    return input.composeMessage('lateCheckoutMessage', {
      hostelName: input.hostelName,
      bedLabel,
      stayRef,
      checkoutTime: input.checkoutTime ?? '—',
    });
  }

  return input.composeMessage('laundryMessage', {
    hostelName: input.hostelName,
    bedLabel,
    stayRef,
  });
}
