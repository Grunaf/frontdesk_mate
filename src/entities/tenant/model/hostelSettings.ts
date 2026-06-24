import type { CurrencyCode, MoneyAmount, TenantCurrencySettings } from '@/shared/lib/currency';

export type { CurrencyCode, MoneyAmount, TenantCurrencySettings };

export interface TenantHostelSettings {
  currency?: TenantCurrencySettings;
  cityTax?: MoneyAmount;
}
