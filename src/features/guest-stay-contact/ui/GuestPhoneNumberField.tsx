'use client';

import { useId, useMemo } from 'react';
import {
  PHONE_COUNTRY_PRESETS,
  composePhoneRaw,
  detectPhoneCountryPresetId,
  extractNationalDigitsFromRaw,
  formatNationalPhoneInput,
  formatPhoneWithCountryPreset,
  getPhoneCountryPreset,
  nationalDigitLength,
  nationalInputPlaceholder,
  parseNationalPhoneInput,
  resolveAdminCountryPresetId,
  type PhoneCountryPresetId,
} from '@/shared/lib/phone-display-presets';
import { cn } from '@/shared/lib/utils';
import { Badge, Label } from '@/shared/ui';
import { guestPhoneCountryFlag } from '../lib/guestPhoneCountryFlag';

type GuestPhoneNumberFieldProps = {
  id: string;
  countrySelectId: string;
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  locked?: boolean;
  invalid?: boolean;
  label: string;
  savedBadge?: string;
};

function toDigitsE164(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

export function GuestPhoneNumberField({
  id,
  countrySelectId,
  value,
  onChange,
  disabled = false,
  locked = false,
  invalid = false,
  label,
  savedBadge,
}: GuestPhoneNumberFieldProps) {
  const labelId = useId();
  const displayValue = toDigitsE164(value);
  const digitsOnly = displayValue.replace(/\D/g, '');

  const countryPresetId = useMemo(
    () => resolveAdminCountryPresetId(digitsOnly, null),
    [digitsOnly]
  );
  const countryPreset = getPhoneCountryPreset(countryPresetId);
  const maxNational = nationalDigitLength(countryPreset);
  const nationalDigits = extractNationalDigitsFromRaw(digitsOnly, countryPresetId);
  const maskedNational = formatNationalPhoneInput(nationalDigits, countryPreset.groupsAfterCountry);
  const placeholder = nationalInputPlaceholder(countryPreset.groupsAfterCountry);
  const flag = guestPhoneCountryFlag(countryPresetId);

  function emitFromParts(nextCountryId: PhoneCountryPresetId, national: string) {
    const nextCountry = getPhoneCountryPreset(nextCountryId);
    const trimmedNational = parseNationalPhoneInput(national, nationalDigitLength(nextCountry));
    const raw = composePhoneRaw(nextCountry.countryCode, trimmedNational);
    if (!raw) {
      onChange('');
      return;
    }
    onChange(`+${raw}`);
  }

  function handleCountryChange(nextCountryId: PhoneCountryPresetId) {
    const national = extractNationalDigitsFromRaw(digitsOnly, countryPresetId);
    emitFromParts(nextCountryId, national);
  }

  function handleNationalChange(nextMasked: string) {
    const digits = nextMasked.replace(/\D/g, '');
    const detected = detectPhoneCountryPresetId(digits);
    if (detected && digits.length > getPhoneCountryPreset(detected).countryCode.length) {
      const national = extractNationalDigitsFromRaw(digits, detected);
      emitFromParts(detected, national);
      return;
    }

    const national = parseNationalPhoneInput(nextMasked, maxNational);
    emitFromParts(countryPresetId, national);
  }

  if (locked && digitsOnly) {
    const formatted = formatPhoneWithCountryPreset(digitsOnly, countryPresetId);
    return (
      <div className="space-y-2" role="group" aria-labelledby={labelId}>
        <div className="flex flex-wrap items-center gap-2">
          <Label id={labelId}>{label}</Label>
          {savedBadge ? (
            <Badge variant="muted">{savedBadge}</Badge>
          ) : null}
        </div>
        <div
          className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2.5 text-sm text-muted-foreground"
          aria-readonly="true"
        >
          <span className="text-lg leading-none opacity-80" aria-hidden>
            {flag}
          </span>
          <span>{formatted}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative shrink-0">
          <span
            className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-lg leading-none"
            aria-hidden
          >
            {flag}
          </span>
          <select
            id={countrySelectId}
            className={cn(
              'h-10 min-w-[5.5rem] appearance-none rounded-md border border-input bg-background pl-9 pr-2 text-sm',
              disabled && 'opacity-60'
            )}
            value={countryPresetId}
            disabled={disabled}
            aria-label={label}
            onChange={(event) => {
              handleCountryChange(event.target.value as PhoneCountryPresetId);
            }}
          >
            {PHONE_COUNTRY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                +{preset.countryCode}
              </option>
            ))}
          </select>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className={cn(
            'flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm',
            invalid && 'border-destructive',
            disabled && 'opacity-60'
          )}
          value={maskedNational}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            handleNationalChange(event.target.value);
          }}
        />
      </div>
    </div>
  );
}
