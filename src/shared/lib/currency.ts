export const CURRENCY_CODES = ['EUR', 'BAM', 'RSD', 'USD'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export interface CurrencyDefinition {
  code: CurrencyCode;
  label: string;
  symbol: string;
  decimals: number;
}

export const CURRENCY_REGISTRY: readonly CurrencyDefinition[] = [
  { code: 'EUR', label: 'Euro (€)', symbol: '€', decimals: 2 },
  { code: 'BAM', label: 'Bosnia mark (KM)', symbol: 'KM', decimals: 2 },
  { code: 'RSD', label: 'Serbian dinar (RSD)', symbol: 'RSD', decimals: 0 },
  { code: 'USD', label: 'US dollar ($)', symbol: '$', decimals: 2 },
] as const;

export type CurrencyDisplayMode = 'primary' | 'dual';

export interface TenantCurrencySettings {
  primary: CurrencyCode;
  displayMode?: CurrencyDisplayMode;
  secondary?: {
    code: CurrencyCode;
    rateFromPrimary: number;
  };
}

export interface MoneyAmount {
  amount: number;
  currency?: CurrencyCode;
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODES.includes(value as CurrencyCode);
}

export function getCurrencyDefinition(code: CurrencyCode): CurrencyDefinition {
  return CURRENCY_REGISTRY.find((entry) => entry.code === code) ?? CURRENCY_REGISTRY[0];
}

export function formatMoneyAmount(
  amount: number,
  currency: CurrencyCode,
  locale = 'en'
): string {
  const definition = getCurrencyDefinition(currency);
  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits: definition.decimals,
    maximumFractionDigits: definition.decimals,
  });

  if (currency === 'EUR' || currency === 'USD') {
    return `${definition.symbol}${formatted}`;
  }

  return `${formatted} ${definition.symbol}`;
}

export function convertMoneyAmount(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rateFromPrimary: number,
  primary: CurrencyCode
): number {
  if (from === to) {
    return amount;
  }

  if (from === primary && to !== primary) {
    return amount * rateFromPrimary;
  }

  if (to === primary && from !== primary) {
    return rateFromPrimary > 0 ? amount / rateFromPrimary : amount;
  }

  const inPrimary = from === primary ? amount : amount / rateFromPrimary;
  return to === primary ? inPrimary : inPrimary * rateFromPrimary;
}

export function formatMoneyWithOptionalSecondary(
  amount: number,
  currency: TenantCurrencySettings,
  locale = 'en'
): string {
  const primaryLabel = formatMoneyAmount(amount, currency.primary, locale);

  if (currency.displayMode !== 'dual' || !currency.secondary) {
    return primaryLabel;
  }

  const converted = convertMoneyAmount(
    amount,
    currency.primary,
    currency.secondary.code,
    currency.secondary.rateFromPrimary,
    currency.primary
  );

  const secondaryLabel = formatMoneyAmount(converted, currency.secondary.code, locale);
  return `${primaryLabel} (≈ ${secondaryLabel})`;
}
