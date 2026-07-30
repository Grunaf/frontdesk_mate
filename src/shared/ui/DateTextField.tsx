'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FORMAT_PLACEHOLDER = 'dd.mm.yyyy';

export type DateSegments = {
  day: string;
  month: string;
  year: string;
};

export const EMPTY_DATE_SEGMENTS: DateSegments = { day: '', month: '', year: '' };

/** Keep only date digits, max DDMMYYYY. */
export function extractDateDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 8);
}

export function segmentsToDisplay(segments: DateSegments): string {
  const { day, month, year } = segments;
  if (!day && !month && !year) return '';
  if (!month && !year) return day;
  if (!year) return `${day}.${month}`;
  return `${day}.${month}.${year}`;
}

export function segmentsToDigits(segments: DateSegments): string {
  return `${segments.day}${segments.month}${segments.year}`;
}

export function isoToSegments(isoDay: string): DateSegments {
  if (!ISO_DAY.test(isoDay)) return { ...EMPTY_DATE_SEGMENTS };
  const [year, month, day] = isoDay.split('-');
  return { day: day ?? '', month: month ?? '', year: year ?? '' };
}

export function isoDateToDisplay(isoDay: string): string {
  return segmentsToDisplay(isoToSegments(isoDay));
}

/**
 * Append one digit into DD → MM → YYYY with segment magnitude checks.
 * Day 01–31 (4–9 auto-pad), month 01–12 (2–9 auto-pad).
 * Returns null when the digit is rejected.
 */
export function appendDateDigit(segments: DateSegments, digit: string): DateSegments | null {
  if (!/^\d$/.test(digit)) return null;

  if (segments.day.length < 2) {
    if (segments.day.length === 0) {
      if (digit >= '4' && digit <= '9') {
        return { ...segments, day: `0${digit}` };
      }
      if (digit >= '0' && digit <= '3') {
        return { ...segments, day: digit };
      }
      return null;
    }
    const day = `${segments.day}${digit}`;
    const value = Number(day);
    if (value < 1 || value > 31) return null;
    return { ...segments, day };
  }

  if (segments.month.length < 2) {
    if (segments.month.length === 0) {
      if (digit >= '2' && digit <= '9') {
        return { ...segments, month: `0${digit}` };
      }
      if (digit === '0' || digit === '1') {
        return { ...segments, month: digit };
      }
      return null;
    }
    const month = `${segments.month}${digit}`;
    const value = Number(month);
    if (value < 1 || value > 12) return null;
    return { ...segments, month };
  }

  if (segments.year.length < 4) {
    return { ...segments, year: `${segments.year}${digit}` };
  }

  return null;
}

export function removeLastDateDigit(segments: DateSegments): DateSegments {
  if (segments.year) {
    return { ...segments, year: segments.year.slice(0, -1) };
  }
  if (segments.month) {
    return { ...segments, month: segments.month.slice(0, -1) };
  }
  if (segments.day) {
    return { ...segments, day: segments.day.slice(0, -1) };
  }
  return segments;
}

/** Feed digits left-to-right through segment rules (e.g. 30122000 → 30.12.2000). */
export function feedDateDigits(rawDigits: string): DateSegments {
  let segments = { ...EMPTY_DATE_SEGMENTS };
  for (const digit of extractDateDigits(rawDigits)) {
    const next = appendDateDigit(segments, digit);
    if (!next) break;
    segments = next;
  }
  return segments;
}

/** @deprecated Prefer feedDateDigits + segmentsToDisplay for segment-aware masking. */
export function digitsToDisplay(digits: string): string {
  return segmentsToDisplay(feedDateDigits(digits));
}

export function displayDateToIso(
  display: string,
  options?: { minYear?: number; maxDate?: Date }
): string | null {
  const trimmed = display.trim();
  if (!trimmed) return '';

  const segments = feedDateDigits(trimmed);
  if (segments.day.length !== 2 || segments.month.length !== 2 || segments.year.length !== 4) {
    return null;
  }

  const day = Number(segments.day);
  const month = Number(segments.month);
  const year = Number(segments.year);
  const minYear = options?.minYear ?? 1920;
  const maxDate = options?.maxDate ?? new Date();

  if (year < minYear || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(`${iso}T12:00:00`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const max = new Date(maxDate);
  max.setHours(23, 59, 59, 999);
  if (date > max) return null;

  return iso;
}

function toCalendarDate(isoDay: string): Date | undefined {
  if (!ISO_DAY.test(isoDay)) return undefined;
  const date = new Date(`${isoDay}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export type DateTextFieldProps = {
  id?: string;
  /** Stored value as YYYY-MM-DD (empty string when unset). */
  value: string;
  onValueChange: (isoDay: string) => void;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  /** Defaults to dd.mm.yyyy so the required format is always visible. */
  placeholder?: string;
  calendarAriaLabel?: string;
  minYear?: number;
  className?: string;
  inputClassName?: string;
};

/**
 * Segment-aware dd.MM.yyyy field: day → month → year, with magnitude checks.
 * Caret stays at the end; backspace removes digits only (dots reassemble).
 */
export function DateTextField({
  id,
  value,
  onValueChange,
  disabled = false,
  'aria-invalid': ariaInvalid,
  placeholder = DATE_FORMAT_PLACEHOLDER,
  calendarAriaLabel = 'Open calendar',
  minYear = 1920,
  className,
  inputClassName,
}: DateTextFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [segments, setSegments] = useState<DateSegments>(() => isoToSegments(value));
  const [open, setOpen] = useState(false);
  const selected = toCalendarDate(value);
  const today = new Date();
  const display = segmentsToDisplay(segments);

  useEffect(() => {
    setSegments(isoToSegments(value));
  }, [value]);

  const pinCaretToEnd = () => {
    const el = inputRef.current;
    if (!el) return;
    const len = el.value.length;
    requestAnimationFrame(() => {
      el.setSelectionRange(len, len);
    });
  };

  const commitSegments = (next: DateSegments) => {
    setSegments(next);
    const nextDisplay = segmentsToDisplay(next);
    if (!next.day && !next.month && !next.year) {
      onValueChange('');
      return;
    }
    if (next.day.length === 2 && next.month.length === 2 && next.year.length === 4) {
      const parsed = displayDateToIso(nextDisplay, { minYear, maxDate: today });
      onValueChange(parsed ?? '');
      return;
    }
    if (value) onValueChange('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      pinCaretToEnd();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      commitSegments(removeLastDateDigit(segments));
      pinCaretToEnd();
      return;
    }

    if (/^\d$/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const next = appendDateDigit(segments, event.key);
      if (next) commitSegments(next);
      pinCaretToEnd();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = extractDateDigits(event.clipboardData.getData('text'));
    if (!pasted) return;
    commitSegments(feedDateDigits(pasted));
    pinCaretToEnd();
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder={placeholder}
        value={display}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onChange={() => {
          // Digits handled in onKeyDown/onPaste so invalid segment input never lands.
        }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={pinCaretToEnd}
        onFocus={pinCaretToEnd}
        onSelect={pinCaretToEnd}
        onBlur={() => {
          const parsed = displayDateToIso(display, { minYear, maxDate: today });
          if (parsed === null) {
            onValueChange('');
            return;
          }
          onValueChange(parsed);
          setSegments(isoToSegments(parsed));
        }}
        className={cn('pr-10', inputClassName)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={calendarAriaLabel}
            className="absolute top-1/2 right-px z-10 h-[calc(100%-2px)] w-10 -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground"
          >
            <CalendarIcon className="size-4" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[60] w-auto p-0"
          align="end"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            startMonth={new Date(minYear, 0)}
            endMonth={today}
            onSelect={(date) => {
              if (!date) return;
              const iso = format(date, 'yyyy-MM-dd');
              onValueChange(iso);
              setSegments(isoToSegments(iso));
              setOpen(false);
            }}
            disabled={{ after: today }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
