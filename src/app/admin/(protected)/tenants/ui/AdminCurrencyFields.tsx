'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CURRENCY_REGISTRY,
  type CurrencyCode,
  isCurrencyCode,
} from '@/shared/lib/currency';
import type { TenantHostelSettings } from '@/entities/tenant/model/hostelSettings';
import type { TenantSettings } from '@/entities/tenant';
import { resolveCityTaxAmount, resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import { AdminMoneyField } from './AdminField';
import { useTenantFormDraft } from './TenantFormDraftContext';

interface AdminCurrencyFieldsProps {
  settings?: TenantSettings;
}

export function AdminCurrencyFields({ settings }: AdminCurrencyFieldsProps) {
  const { updateDraft, syncDraft } = useTenantFormDraft();
  const userEditedRef = useRef(false);
  const initialCurrency = useMemo(() => resolveTenantCurrency(settings ?? {}), [settings]);
  const initialTax = useMemo(() => resolveCityTaxAmount(settings ?? {}), [settings]);

  const [primary, setPrimary] = useState<CurrencyCode>(initialCurrency.primary);
  const [displayMode, setDisplayMode] = useState<'primary' | 'dual'>(
    initialCurrency.displayMode ?? 'primary'
  );
  const [secondaryCode, setSecondaryCode] = useState<CurrencyCode>(
    initialCurrency.secondary?.code ?? 'BAM'
  );
  const [secondaryRate, setSecondaryRate] = useState(
    String(initialCurrency.secondary?.rateFromPrimary ?? '')
  );
  const [taxAmount, setTaxAmount] = useState(
    initialTax ? String(initialTax.amount) : settings?.cityTax?.replace(/[^\d.,]/g, '') ?? ''
  );

  const hostelJson: TenantHostelSettings = useMemo(
    () => ({
      currency: {
        primary,
        displayMode,
        secondary:
          displayMode === 'dual' && secondaryRate.trim()
            ? {
                code: secondaryCode,
                rateFromPrimary: Number(secondaryRate),
              }
            : undefined,
      },
      cityTax:
        taxAmount.trim() && Number.isFinite(Number(taxAmount))
          ? { amount: Number(taxAmount), currency: primary }
          : undefined,
    }),
    [displayMode, primary, secondaryCode, secondaryRate, taxAmount]
  );

  useEffect(() => {
    if (userEditedRef.current) {
      updateDraft({ hostel: hostelJson });
      userEditedRef.current = false;
      return;
    }
    syncDraft({ hostel: hostelJson });
  }, [hostelJson, syncDraft, updateDraft]);

  const markUserEdit = () => {
    userEditedRef.current = true;
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Primary currency</span>
        <select
          value={primary}
          onChange={(event) => {
            const next = event.target.value;
            if (isCurrencyCode(next)) {
              markUserEdit();
              setPrimary(next);
            }
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {CURRENCY_REGISTRY.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Guest price display</span>
        <select
          value={displayMode}
          onChange={(event) => {
            markUserEdit();
            setDisplayMode(event.target.value as 'primary' | 'dual');
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="primary">Primary currency only</option>
          <option value="dual">Primary + converted secondary</option>
        </select>
      </label>

      {displayMode === 'dual' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Secondary currency</span>
            <select
              value={secondaryCode}
              onChange={(event) => {
                const next = event.target.value;
                if (isCurrencyCode(next)) {
                  markUserEdit();
                  setSecondaryCode(next);
                }
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {CURRENCY_REGISTRY.filter((entry) => entry.code !== primary).map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Exchange rate</span>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">1 {primary} =</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={secondaryRate}
                onChange={(event) => {
                  markUserEdit();
                  setSecondaryRate(event.target.value);
                }}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-xs text-muted-foreground">{secondaryCode}</span>
            </div>
          </label>
        </div>
      ) : null}

      <AdminMoneyField
        label="City tourist tax (per person / night)"
        name="cityTaxAmount"
        value={taxAmount}
        onChange={(value) => {
          markUserEdit();
          setTaxAmount(value);
        }}
        currencyCode={primary}
      />
    </div>
  );
}
