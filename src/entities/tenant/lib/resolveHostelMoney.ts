import {
  formatMoneyAmount,
  type CurrencyCode,
  type MoneyAmount,
  type TenantCurrencySettings,
  isCurrencyCode,
} from '@/shared/lib/currency';
import type { TenantSettings } from '../model/settings';

function parseLegacyCityTaxAmount(value?: string): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.replace(/[^\d.,]/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function inferPrimaryFromLegacy(settings: TenantSettings): CurrencyCode {
  const legacy = settings.cityTax?.trim() ?? '';
  if (legacy.includes('KM') || legacy.includes('BAM')) {
    return 'BAM';
  }

  if (legacy.includes('RSD') || legacy.includes('дин')) {
    return 'RSD';
  }

  return 'EUR';
}

export function resolveTenantCurrency(settings: TenantSettings): TenantCurrencySettings {
  const stored = settings.hostel?.currency;
  const primary =
    stored?.primary && isCurrencyCode(stored.primary) ? stored.primary : inferPrimaryFromLegacy(settings);

  return {
    primary,
    displayMode: stored?.displayMode ?? 'primary',
    secondary: stored?.secondary,
  };
}

export function resolveCityTaxAmount(settings: TenantSettings): MoneyAmount | undefined {
  const structured = settings.hostel?.cityTax;
  if (structured && typeof structured.amount === 'number') {
    return {
      amount: structured.amount,
      currency: structured.currency ?? resolveTenantCurrency(settings).primary,
    };
  }

  const legacyAmount = parseLegacyCityTaxAmount(settings.cityTax);
  if (legacyAmount == null) {
    return undefined;
  }

  return {
    amount: legacyAmount,
    currency: resolveTenantCurrency(settings).primary,
  };
}

export function resolveCityTaxDisplay(settings: TenantSettings, locale = 'en'): string {
  const tax = resolveCityTaxAmount(settings);
  if (!tax) {
    return settings.cityTax?.trim() ?? '';
  }

  return formatMoneyAmount(tax.amount, tax.currency ?? resolveTenantCurrency(settings).primary, locale);
}

export function formatLandingRoomPrice(
  settings: TenantSettings,
  amount?: number,
  locale = 'en'
): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return null;
  }

  const currency = resolveTenantCurrency(settings).primary;
  return formatMoneyAmount(amount, currency, locale);
}
