'use client';

import { useMemo, useState } from 'react';
import {
  inferPhoneDisplayPreset,
  PHONE_DISPLAY_PRESET_OPTIONS,
  type PhoneDisplayPresetId,
} from '@/shared/lib/phone-display-presets';
import { resolvePhoneDisplay, resolveStoredPhoneMask } from '@/shared/lib/phoneDisplay';
import { cn } from '@/shared/lib/utils';
import { shouldShowPhoneDisplayOptions } from '../lib/tenantAdminFieldSpecs';
import { adminFieldWidthClass } from './AdminField';

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
  const [customMask, setCustomMask] = useState(defaultMask ?? '');

  const resolvedMask = useMemo(
    () => resolveStoredPhoneMask(raw, customMask, preset) ?? '',
    [customMask, preset, raw]
  );

  const preview = useMemo(
    () => resolvePhoneDisplay(raw, preset === 'custom' ? customMask : undefined, preset),
    [customMask, preset, raw]
  );

  const showDisplayOptions =
    !collapseWhenEmpty || shouldShowPhoneDisplayOptions(raw, defaultRaw);

  return (
    <div>
      <input type="hidden" name={rawName} value={raw} />
      <input type="hidden" name={maskName} value={showDisplayOptions ? resolvedMask : ''} />
      <input type="hidden" name={presetName} value={showDisplayOptions ? preset : 'auto'} />
      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
            {label}
            {missing ? (
              <span className="text-xs font-normal text-amber-700">Required for guests</span>
            ) : null}
          </span>
          {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
          <input
            type="text"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="38761538331"
            className={cn(
              'rounded-md border bg-background px-3 py-2 text-sm',
              adminFieldWidthClass('md'),
              missing && 'border-amber-400 ring-1 ring-amber-200'
            )}
          />
        </label>

        {showDisplayOptions ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Display format</span>
              <select
                value={preset}
                onChange={(event) => setPreset(event.target.value as PhoneDisplayPresetId)}
                className={cn(
                  'rounded-md border bg-background px-3 py-2 text-sm',
                  adminFieldWidthClass('sm')
                )}
              >
                {PHONE_DISPLAY_PRESET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {preset === 'custom' ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Display label</span>
                <input
                  type="text"
                  value={customMask}
                  onChange={(event) => setCustomMask(event.target.value)}
                  placeholder="+387 61 538 331"
                  className={cn(
                    'rounded-md border bg-background px-3 py-2 text-sm',
                    adminFieldWidthClass('md')
                  )}
                />
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                Guests see: <span className="font-medium text-foreground">{preview || '—'}</span>
              </p>
            )}
          </>
        ) : null}
      </div>
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
  collapseWhenEmpty = true,
}: AdminPhoneFieldInlineProps) {
  const preview = useMemo(
    () => resolvePhoneDisplay(raw, preset === 'custom' ? mask : undefined, preset),
    [mask, preset, raw]
  );

  const showDisplayOptions = !collapseWhenEmpty || shouldShowPhoneDisplayOptions(raw);

  function updateRaw(nextRaw: string) {
    onRawChange(nextRaw);
    onMaskChange(resolveStoredPhoneMask(nextRaw, mask, preset) ?? '');
  }

  function updatePreset(nextPreset: PhoneDisplayPresetId) {
    onPresetChange(nextPreset);
    onMaskChange(resolveStoredPhoneMask(raw, mask, nextPreset) ?? '');
  }

  function updateCustomMask(nextMask: string) {
    onMaskChange(nextMask);
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {hint ? <span className="block text-[11px] text-muted-foreground">{hint}</span> : null}
        <input
          value={raw}
          onChange={(event) => updateRaw(event.target.value)}
          placeholder="38761538331"
          className="w-full max-w-md rounded-md border bg-background px-2.5 py-1.5 text-sm"
        />
      </label>

      {showDisplayOptions ? (
        <>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Display format</span>
            <select
              value={preset}
              onChange={(event) => updatePreset(event.target.value as PhoneDisplayPresetId)}
              className="w-full max-w-[12rem] rounded-md border bg-background px-2.5 py-1.5 text-sm"
            >
              {PHONE_DISPLAY_PRESET_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {preset === 'custom' ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Display label</span>
              <input
                value={mask}
                onChange={(event) => updateCustomMask(event.target.value)}
                className="w-full max-w-md rounded-md border bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Guests see: <span className="font-medium text-foreground">{preview || '—'}</span>
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
