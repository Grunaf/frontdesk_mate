import { parseGuestExtraPriceLabel } from '@/entities/guest-extra';

type GuestExtraPriceTranslate = (
  key: 'priceFormatted' | 'highlightPriceFrom' | 'priceAskReception',
  values?: { amount: string; currency: string }
) => string;

export type GuestExtraPriceVariant = 'standard' | 'from';

export function formatGuestExtraPriceLine(
  t: GuestExtraPriceTranslate,
  priceLabel: string | null | undefined,
  variant: GuestExtraPriceVariant = 'standard'
): string {
  const parsed = parseGuestExtraPriceLabel(priceLabel);
  if (!parsed) {
    return t('priceAskReception');
  }

  if (variant === 'from') {
    return t('highlightPriceFrom', {
      amount: parsed.amount,
      currency: parsed.currency,
    });
  }

  return t('priceFormatted', {
    amount: parsed.amount,
    currency: parsed.currency,
  });
}
