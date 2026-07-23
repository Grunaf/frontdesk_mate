'use client';

import { useId, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js/min';
import { useLocale } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  Badge,
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Input,
  Label,
} from '@/shared/ui';
import { guestPhoneCountryFlag } from '../lib/guestPhoneCountryFlag';

const PINNED_COUNTRY_CODES: readonly CountryCode[] = ['BA', 'ME', 'RS', 'HR', 'SI', 'DE'];
const FALLBACK_DEFAULT_COUNTRY: CountryCode = 'ME';

type GuestPhoneCountryOption = {
  code: CountryCode;
  callingCode: string;
  label: string;
  flag: string;
};

type GuestPhoneNumberFieldProps = {
  id: string;
  countrySelectId: string;
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  locked?: boolean;
  invalid?: boolean;
  label: string;
  /** Accessible label for the country picker trigger (defaults to `label`). */
  countryLabel?: string;
  /** ISO-3166 alpha-2 default when value is empty / unparseable. */
  defaultCountry?: CountryCode;
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

function detectCountryFromValue(raw: string): CountryCode | null {
  const candidate = toDigitsE164(raw);
  if (!candidate) {
    return null;
  }
  const parsed = parsePhoneNumberFromString(candidate);
  return parsed?.country ?? null;
}

function extractNationalDigits(raw: string, country: CountryCode): string {
  const candidate = toDigitsE164(raw);
  if (!candidate) {
    return '';
  }

  const parsed = parsePhoneNumberFromString(candidate);
  if (parsed?.country === country) {
    return parsed.nationalNumber;
  }

  const digits = candidate.slice(1);
  const callingCode = getCountryCallingCode(country);
  if (digits.startsWith(callingCode)) {
    return digits.slice(callingCode.length);
  }

  return digits;
}

/**
 * Cap national digits for input UX:
 * - hard stop on lib `TOO_LONG`
 * - also stop when AsYouType mask disappears after it appeared
 *   (e.g. RU allows 10 or 14 in metadata; 11–13 drop formatting)
 */
function clipNationalDigits(country: CountryCode, nationalDigits: string): string {
  let accepted = '';
  let sawMask = false;

  for (const digit of nationalDigits.replace(/\D/g, '')) {
    const next = `${accepted}${digit}`;
    if (validatePhoneNumberLength(next, country) === 'TOO_LONG') {
      break;
    }

    const formatted = new AsYouType(country).input(next);
    const hasMask = /[\s\-()]/.test(formatted);
    if (hasMask) {
      sawMask = true;
    } else if (sawMask) {
      break;
    }

    accepted = next;
  }

  return accepted;
}

function composeE164(country: CountryCode, nationalDigits: string): string {
  const digits = clipNationalDigits(country, nationalDigits);
  if (!digits) {
    return '';
  }
  return `+${getCountryCallingCode(country)}${digits}`;
}

function formatNationalDisplay(country: CountryCode, nationalDigits: string): string {
  if (!nationalDigits) {
    return '';
  }
  const formatter = new AsYouType(country);
  return formatter.input(nationalDigits);
}

function formatLockedPhone(raw: string): string {
  const candidate = toDigitsE164(raw);
  if (!candidate) {
    return '';
  }
  const parsed = parsePhoneNumberFromString(candidate);
  if (parsed) {
    return parsed.formatInternational();
  }
  return candidate;
}

function buildCountryOptions(locale: string): GuestPhoneCountryOption[] {
  const displayNames =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl
      ? new Intl.DisplayNames([locale, 'en'], { type: 'region' })
      : null;

  return getCountries().map((code) => {
    const label = displayNames?.of(code) ?? code;
    return {
      code,
      callingCode: String(getCountryCallingCode(code)),
      label,
      flag: guestPhoneCountryFlag(code),
    };
  });
}

function sortCountryOptions(
  options: GuestPhoneCountryOption[],
  pinned: readonly CountryCode[]
): { pinned: GuestPhoneCountryOption[]; rest: GuestPhoneCountryOption[] } {
  const byCode = new Map(options.map((option) => [option.code, option]));
  const pinnedOptions = pinned
    .map((code) => byCode.get(code))
    .filter((option): option is GuestPhoneCountryOption => Boolean(option));
  const pinnedSet = new Set(pinned);
  const rest = options
    .filter((option) => !pinnedSet.has(option.code))
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
  return { pinned: pinnedOptions, rest };
}

function matchesCountryQuery(option: GuestPhoneCountryOption, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const calling = `+${option.callingCode}`;
  return (
    option.label.toLowerCase().includes(normalized) ||
    option.code.toLowerCase().includes(normalized) ||
    option.callingCode.includes(normalized.replace(/^\+/, '')) ||
    calling.includes(normalized)
  );
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
  countryLabel,
  defaultCountry = FALLBACK_DEFAULT_COUNTRY,
  savedBadge,
}: GuestPhoneNumberFieldProps) {
  const labelId = useId();
  const searchId = useId();
  const locale = useLocale();
  const resolvedDefault = defaultCountry || FALLBACK_DEFAULT_COUNTRY;

  const detectedCountry = detectCountryFromValue(value);
  const [manualCountry, setManualCountry] = useState<CountryCode>(resolvedDefault);
  const selectedCountry = detectedCountry ?? manualCountry;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const countryOptions = useMemo(() => buildCountryOptions(locale), [locale]);
  const { pinned, rest } = useMemo(
    () => sortCountryOptions(countryOptions, PINNED_COUNTRY_CODES),
    [countryOptions]
  );

  const filteredPinned = useMemo(
    () => pinned.filter((option) => matchesCountryQuery(option, searchQuery)),
    [pinned, searchQuery]
  );
  const filteredRest = useMemo(
    () => rest.filter((option) => matchesCountryQuery(option, searchQuery)),
    [rest, searchQuery]
  );

  const nationalDigits = clipNationalDigits(
    selectedCountry,
    extractNationalDigits(value, selectedCountry)
  );
  const maskedNational = formatNationalDisplay(selectedCountry, nationalDigits);
  const flag = guestPhoneCountryFlag(selectedCountry);
  const callingCode = getCountryCallingCode(selectedCountry);
  const countryTriggerLabel = countryLabel ?? label;

  function emitFromParts(nextCountry: CountryCode, national: string) {
    onChange(composeE164(nextCountry, national));
  }

  function handlePickerOpenChange(open: boolean) {
    setPickerOpen(open);
    if (!open) {
      setSearchQuery('');
    }
  }

  function handleCountrySelect(nextCountry: CountryCode) {
    const national = clipNationalDigits(
      nextCountry,
      extractNationalDigits(value, selectedCountry)
    );
    setManualCountry(nextCountry);
    emitFromParts(nextCountry, national);
    handlePickerOpenChange(false);
  }

  function handleNationalChange(nextInput: string) {
    const digits = nextInput.replace(/\D/g, '');
    // Allow pasting a full international number into the national field.
    if (nextInput.trim().startsWith('+')) {
      const pasted = toDigitsE164(nextInput);
      const parsed = pasted ? parsePhoneNumberFromString(pasted) : undefined;
      if (parsed?.isValid() && parsed.country) {
        setManualCountry(parsed.country);
        onChange(parsed.format('E.164'));
        return;
      }
    }
    emitFromParts(selectedCountry, clipNationalDigits(selectedCountry, digits));
  }

  if (locked && toDigitsE164(value)) {
    const formatted = formatLockedPhone(value);
    return (
      <div className="space-y-2" role="group" aria-labelledby={labelId}>
        <div className="flex flex-wrap items-center gap-2">
          <Label id={labelId}>{label}</Label>
          {savedBadge ? <Badge variant="muted">{savedBadge}</Badge> : null}
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
        <button
          id={countrySelectId}
          type="button"
          disabled={disabled}
          aria-label={countryTriggerLabel}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none',
            'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
            disabled && 'pointer-events-none opacity-50'
          )}
          onClick={() => setPickerOpen(true)}
        >
          <span className="text-base leading-none" aria-hidden>
            {flag}
          </span>
          <span className="tabular-nums">+{callingCode}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className="min-w-0 flex-1"
          value={maskedNational}
          placeholder="…"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            handleNationalChange(event.target.value);
          }}
        />
      </div>

      <BottomSheet open={pickerOpen} onOpenChange={handlePickerOpenChange}>
        <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col">
          <BottomSheetHeader className="gap-3">
            <BottomSheetTitle>{countryTriggerLabel}</BottomSheetTitle>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={searchId}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search country or +code"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="pl-9"
                aria-label="Search country or +code"
              />
            </div>
          </BottomSheetHeader>
          <BottomSheetBody className="flex flex-col gap-1 px-3 pt-2 pb-4">
            {filteredPinned.length === 0 && filteredRest.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No countries found</p>
            ) : null}

            {filteredPinned.map((option) => (
              <CountryOptionButton
                key={`pinned-${option.code}`}
                option={option}
                selected={option.code === selectedCountry}
                onSelect={handleCountrySelect}
              />
            ))}

            {filteredPinned.length > 0 && filteredRest.length > 0 ? (
              <div className="my-2 border-t border-border/60" role="separator" />
            ) : null}

            {filteredRest.map((option) => (
              <CountryOptionButton
                key={option.code}
                option={option}
                selected={option.code === selectedCountry}
                onSelect={handleCountrySelect}
              />
            ))}
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}

function CountryOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: GuestPhoneCountryOption;
  selected: boolean;
  onSelect: (code: CountryCode) => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        selected && 'bg-accent/70'
      )}
      onClick={() => onSelect(option.code)}
    >
      <span className="text-lg leading-none" aria-hidden>
        {option.flag}
      </span>
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">+{option.callingCode}</span>
    </button>
  );
}
