import type { GuestStayPlan } from '@/entities/tenant';
import { formatGuestStayCheckoutShort } from './formatGuestStayDates';

type BedLocationTranslate = (
  key: 'bedLabel' | 'bedWithTier' | 'bedTierUpper' | 'bedTierLower',
  values?: Record<string, string | number>
) => string;

export function resolveGuestStayBedLabel(
  plan: GuestStayPlan,
  t: BedLocationTranslate
): string {
  if (!plan.bedId) {
    return '';
  }

  const slot = plan.bedSlot ?? plan.bedLabel ?? plan.bedId;

  if (plan.bedTier === 'upper') {
    return t('bedWithTier', { slot: String(slot), tier: t('bedTierUpper') });
  }

  if (plan.bedTier === 'lower') {
    return t('bedWithTier', { slot: String(slot), tier: t('bedTierLower') });
  }

  return String(slot);
}

export function buildExtendStayWhatsappMessage(input: {
  hostelName: string;
  bedLabel: string;
  checkOutAt: string;
  locale: string;
  stayRef: string | null;
  guestName: string | null;
  composeMessage: (
    key: 'extendStayMessage' | 'extendStayMessageNamed',
    values: {
      hostelName: string;
      bedLabel: string;
      checkoutDate: string;
      stayRef: string;
      guestName?: string;
    }
  ) => string;
}): string {
  const checkoutDate =
    formatGuestStayCheckoutShort(input.checkOutAt, input.locale) ?? input.checkOutAt;
  const stayRef = input.stayRef ?? '—';
  const trimmedName = input.guestName?.trim();

  if (trimmedName) {
    return input.composeMessage('extendStayMessageNamed', {
      hostelName: input.hostelName,
      bedLabel: input.bedLabel || '—',
      checkoutDate,
      stayRef,
      guestName: trimmedName,
    });
  }

  return input.composeMessage('extendStayMessage', {
    hostelName: input.hostelName,
    bedLabel: input.bedLabel || '—',
    checkoutDate,
    stayRef,
  });
}
