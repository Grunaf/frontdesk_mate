'use client';

import { useMemo, useState } from 'react';
import {
  composePhoneRaw,
  extractNationalDigitsFromRaw,
  formatNationalPhoneInput,
  getPhoneCountryPreset,
  inferPhoneDisplayPreset,
  nationalDigitLength,
  nationalInputPlaceholder,
  parseNationalPhoneInput,
  PHONE_COUNTRY_PRESETS,
  resolveAdminCountryPresetId,
  resolvePhoneFormatPresetForDraft,
  type PhoneCountryPresetId,
  type PhoneDisplayPresetId,
} from '@/shared/lib/phone-display-presets';
import { resolveStoredPhoneMask } from '@/shared/lib/phoneDisplay';
import { cn } from '@/shared/lib/utils';
import { shouldShowPhoneDisplayOptions } from '../lib/tenantAdminFieldSpecs';

interface AdminPhoneFieldRowProps {
  label: string;
  hint?: string;
  missing?: boolean;
  raw: string;
  mask: string;
  preset: PhoneDisplayPresetId;
  onRawChange: (value: string) => void;
  onMaskChange: (value: string) => void;
  onPresetChange: (value: PhoneDisplayPresetId) => void;
  labelClassName?: string;
  inputClassName?: string;
  compact?: boolean;
}

function AdminPhoneFieldRow({
  label,
  hint,
  missing,
  raw,
  mask,
  preset,
  onRawChange,
  onMaskChange,
  onPresetChange,
  labelClassName,
  inputClassName,
  compact = false,
}: AdminPhoneFieldRowProps) {
  const countryPresetId = useMemo(
    () => resolveAdminCountryPresetId(raw, preset),
    [preset, raw]
  );
  const countryPreset = getPhoneCountryPreset(countryPresetId);
  const maxNational = nationalDigitLength(countryPreset);
  const nationalDigits = extractNationalDigitsFromRaw(raw, countryPresetId);
  const maskedNational = formatNationalPhoneInput(
    nationalDigits,
    countryPreset.groupsAfterCountry
  );
  const placeholder = nationalInputPlaceholder(countryPreset.groupsAfterCountry);

  function commitChange(nextRaw: string, nextCountryId: PhoneCountryPresetId) {
    const nextPreset = resolvePhoneFormatPresetForDraft(nextRaw, nextCountryId);
    onRawChange(nextRaw);
    onPresetChange(nextPreset);
    onMaskChange(resolveStoredPhoneMask(nextRaw, mask, nextPreset) ?? '');
  }

  function handleCountryChange(nextCountryId: PhoneCountryPresetId) {
    const nextCountry = getPhoneCountryPreset(nextCountryId);
    const national = extractNationalDigitsFromRaw(raw, countryPresetId);
    const trimmed = parseNationalPhoneInput(national, nationalDigitLength(nextCountry));
    const nextRaw = composePhoneRaw(nextCountry.countryCode, trimmed);
    commitChange(nextRaw, nextCountryId);
  }

  function handleNationalChange(value: string) {
    const national = parseNationalPhoneInput(value, maxNational);
    const nextRaw = composePhoneRaw(countryPreset.countryCode, national);
    commitChange(nextRaw, countryPresetId);
  }

  const selectClass = cn(
    'shrink-0 rounded-md border bg-background py-1.5 text-sm',
    compact ? 'px-2' : 'px-2.5',
    inputClassName
  );
  const nationalInputClass = cn(
    'min-w-0 flex-1 rounded-md border bg-background py-1.5 text-sm',
    compact ? 'px-2' : 'px-2.5',
    missing && 'border-amber-400 ring-1 ring-amber-200',
    inputClassName
  );

  return (
    <label className={cn('block space-y-1', labelClassName)}>
      <span
        className={cn(
          'flex flex-wrap items-center gap-2 font-medium',
          compact ? 'text-xs text-muted-foreground' : 'text-sm'
        )}
      >
        {label}
        {missing ? (
          <span className="ml-2 text-xs font-normal text-amber-700">Required for guests</span>
        ) : null}
      </span>
      {hint ? (
        <span
          className={cn(
            'block text-muted-foreground',
            compact ? 'text-[11px]' : 'text-xs'
          )}
        >
          {hint}
        </span>
      ) : null}
      <div className="flex max-w-md gap-2">
        <select
          value={countryPresetId}
          onChange={(event) => handleCountryChange(event.target.value as PhoneCountryPresetId)}
          className={selectClass}
          aria-label={`${label} country code`}
        >
          {PHONE_COUNTRY_PRESETS.map((option) => (
            <option key={option.id} value={option.id}>
              +{option.countryCode}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={maskedNational}
          onChange={(event) => handleNationalChange(event.target.value)}
          placeholder={placeholder}
          className={nationalInputClass}
        />
      </div>
    </label>
  );
}

interface AdminPhoneFieldProps {
  label: string;
  hint?: string;
  missing?: boolean;
  rawName: string;
  maskName: string;
  presetName: string;
  defaultRaw?: string;
  defaultMask?: string;
  defaultPreset?: PhoneDisplayPresetId;
  collapseWhenEmpty?: boolean;
}

export function AdminPhoneField({
  label,
  hint,
  missing,
  rawName,
  maskName,
  presetName,
  defaultRaw,
  defaultMask,
  defaultPreset,
  collapseWhenEmpty = true,
}: AdminPhoneFieldProps) {
  const [raw, setRaw] = useState(defaultRaw ?? '');
  const [preset, setPreset] = useState<PhoneDisplayPresetId>(() =>
    inferPhoneDisplayPreset(defaultRaw, defaultMask, defaultPreset)
  );
  const [mask, setMask] = useState(defaultMask ?? '');

  const showDisplayOptions =
    !collapseWhenEmpty || shouldShowPhoneDisplayOptions(raw, defaultRaw);

  const resolvedMask = useMemo(
    () => resolveStoredPhoneMask(raw, mask, preset) ?? '',
    [mask, preset, raw]
  );

  return (
    <div>
      <input type="hidden" name={rawName} value={raw} />
      <input type="hidden" name={maskName} value={showDisplayOptions ? resolvedMask : ''} />
      <input type="hidden" name={presetName} value={showDisplayOptions ? preset : 'auto'} />
      <AdminPhoneFieldRow
        label={label}
        hint={hint}
        missing={missing}
        raw={raw}
        mask={mask}
        preset={preset}
        onRawChange={setRaw}
        onMaskChange={setMask}
        onPresetChange={setPreset}
      />
    </div>
  );
}

interface AdminPhoneFieldInlineProps {
  label: string;
  hint?: string;
  raw: string;
  mask: string;
  preset: PhoneDisplayPresetId;
  onRawChange: (value: string) => void;
  onMaskChange: (value: string) => void;
  onPresetChange: (value: PhoneDisplayPresetId) => void;
  collapseWhenEmpty?: boolean;
}

export function AdminPhoneFieldInline({
  label,
  hint,
  raw,
  mask,
  preset,
  onRawChange,
  onMaskChange,
  onPresetChange,
  collapseWhenEmpty: _collapseWhenEmpty = true,
}: AdminPhoneFieldInlineProps) {
  return (
    <div className="sm:col-span-2">
      <AdminPhoneFieldRow
        label={label}
        hint={hint}
        raw={raw}
        mask={mask}
        preset={preset}
        onRawChange={onRawChange}
        onMaskChange={onMaskChange}
        onPresetChange={onPresetChange}
        compact
      />
    </div>
  );
}
