export interface ParsedGuestExtraPrice {
  amount: string;
  currency: string;
}

export function parseGuestExtraPriceLabel(priceLabel: string | null | undefined): ParsedGuestExtraPrice | null {
  const trimmed = priceLabel?.trim();
  if (!trimmed) {
    return null;
  }

  const amountOnly = trimmed.match(/^(\d+(?:[.,]\d+)?)$/);
  if (amountOnly) {
    return {
      amount: amountOnly[1].replace(',', '.'),
      currency: '€',
    };
  }

  const withCurrency = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/);
  if (withCurrency) {
    return {
      amount: withCurrency[1].replace(',', '.'),
      currency: withCurrency[2].trim(),
    };
  }

  return null;
}
