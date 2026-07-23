'use client';

import { useMemo } from 'react';
import type { EntryTransportType } from '@/entities/guest-tourism-registration';
import { ENTRY_TRANSPORT_TYPES } from '@/entities/guest-tourism-registration';
import { cn } from '@/shared/lib/utils';
import { Input, Label } from '@/shared/ui';
import type { TourismEntryPointsCatalog } from '../lib/tourismEntryPointsCatalog';

export type EntryTransportPointCopy = {
  transportLegend: string;
  transportLabels: Record<EntryTransportType, string>;
  entryPointLabel: string;
  entryPointAirportHint: string;
  entryPointPlaceHint: string;
  entryPointAirportPlaceholder: string;
  entryPointPlacePlaceholder: string;
};

export type EntryStampPageCopy = {
  stampPageLabel: string;
  stampPageHint: string;
  stampHelpLink: string;
  formatStampPageGuestLabel: (name: string) => string;
};

type EntryTransportPointFieldsProps = {
  catalog: TourismEntryPointsCatalog | undefined;
  copy: EntryTransportPointCopy;
  disabled?: boolean;
  locked?: boolean;
  transportType: EntryTransportType | '';
  onTransportTypeChange: (value: EntryTransportType) => void;
  entryPointCode: string;
  entryPointLabel: string;
  onEntryPointChange: (next: { code: string; label: string }) => void;
  fieldError?: string | null;
  className?: string;
};

export function EntryTransportPointFields({
  catalog,
  copy,
  disabled = false,
  locked = false,
  transportType,
  onTransportTypeChange,
  entryPointCode,
  entryPointLabel,
  onEntryPointChange,
  fieldError,
  className,
}: EntryTransportPointFieldsProps) {
  const fieldsDisabled = disabled || locked;
  const isPlane = transportType === 'plane';
  const airportOptions = catalog?.airports ?? [];
  const placeSuggestions = useMemo(() => {
    const q = entryPointLabel.trim().toLowerCase();
    const suggestions = catalog?.placeSuggestions ?? [];
    if (!q) return suggestions.slice(0, 8);
    return suggestions
      .filter((item) => item.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalog?.placeSuggestions, entryPointLabel]);

  return (
    <div className={cn('space-y-5', className)}>
      <fieldset className="space-y-2" disabled={fieldsDisabled}>
        <legend className="text-sm font-medium text-foreground">{copy.transportLegend}</legend>
        <div className="flex flex-wrap gap-3">
          {ENTRY_TRANSPORT_TYPES.map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-center gap-2 text-sm text-foreground',
                fieldsDisabled && 'pointer-events-none opacity-60'
              )}
            >
              <input
                type="radio"
                name="entry-transport-type"
                value={value}
                checked={transportType === value}
                onChange={() => onTransportTypeChange(value)}
                disabled={fieldsDisabled}
                className="size-4 accent-primary"
              />
              <span>{copy.transportLabels[value]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {transportType ? (
        <div className="space-y-2">
          <Label htmlFor="entry-point-field">{copy.entryPointLabel}</Label>
          {isPlane ? (
            <>
              <select
                id="entry-point-field"
                value={entryPointCode}
                disabled={fieldsDisabled || airportOptions.length === 0}
                aria-invalid={Boolean(fieldError)}
                onChange={(event) => {
                  const code = event.target.value;
                  const airport = airportOptions.find((item) => item.code === code);
                  onEntryPointChange({
                    code,
                    label: airport?.label ?? '',
                  });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{copy.entryPointAirportPlaceholder}</option>
                {airportOptions.map((airport) => (
                  <option key={airport.code} value={airport.code}>
                    {airport.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{copy.entryPointAirportHint}</p>
            </>
          ) : (
            <>
              <Input
                id="entry-point-field"
                list="entry-point-suggestions"
                value={entryPointLabel}
                disabled={fieldsDisabled}
                aria-invalid={Boolean(fieldError)}
                placeholder={copy.entryPointPlacePlaceholder}
                onChange={(event) => {
                  onEntryPointChange({ code: '', label: event.target.value });
                }}
              />
              <datalist id="entry-point-suggestions">
                {placeSuggestions.map((item) => (
                  <option key={item.id} value={item.label} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">{copy.entryPointPlaceHint}</p>
            </>
          )}
        </div>
      ) : null}

      {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
    </div>
  );
}

type EntryStampPageFieldsProps = {
  copy: EntryStampPageCopy;
  disabled?: boolean;
  locked?: boolean;
  guests: Array<{ id: string; label: string }>;
  stampPages: Record<string, string>;
  onStampPageChange: (guestId: string, value: string) => void;
  onOpenStampHelp: () => void;
  fieldError?: string | null;
  className?: string;
};

export function EntryStampPageFields({
  copy,
  disabled = false,
  locked = false,
  guests,
  stampPages,
  onStampPageChange,
  onOpenStampHelp,
  fieldError,
  className,
}: EntryStampPageFieldsProps) {
  const fieldsDisabled = disabled || locked;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>{copy.stampPageLabel}</Label>
        <button
          type="button"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={onOpenStampHelp}
        >
          {copy.stampHelpLink}
        </button>
      </div>
      {guests.length <= 1 ? (
        <div className="space-y-2">
          <Input
            id="entry-stamp-page"
            inputMode="numeric"
            pattern="[0-9]*"
            value={stampPages[guests[0]?.id ?? ''] ?? ''}
            disabled={fieldsDisabled || guests.length === 0}
            placeholder="e.g. 12"
            onChange={(event) => {
              const guestId = guests[0]?.id;
              if (!guestId) return;
              onStampPageChange(guestId, event.target.value.replace(/[^\d]/g, ''));
            }}
          />
          <p className="text-xs text-muted-foreground">{copy.stampPageHint}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {guests.map((guest) => (
            <li key={guest.id} className="space-y-1.5">
              <Label htmlFor={`entry-stamp-page-${guest.id}`}>
                {copy.formatStampPageGuestLabel(guest.label)}
              </Label>
              <Input
                id={`entry-stamp-page-${guest.id}`}
                inputMode="numeric"
                pattern="[0-9]*"
                value={stampPages[guest.id] ?? ''}
                disabled={fieldsDisabled}
                onChange={(event) =>
                  onStampPageChange(guest.id, event.target.value.replace(/[^\d]/g, ''))
                }
              />
            </li>
          ))}
          <p className="text-xs text-muted-foreground">{copy.stampPageHint}</p>
        </ul>
      )}
      {fieldError ? <p className="text-xs text-destructive">{fieldError}</p> : null}
    </div>
  );
}
