'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export type SearchableSelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  className?: string;
  /** Trigger button size class override (e.g. reception compact). */
  triggerClassName?: string;
};

export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matches',
  disabled = false,
  'aria-invalid': ariaInvalid,
  className,
  triggerClassName,
}: SearchableSelectProps) {
  const listId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => {
      const label = option.label.toLowerCase();
      const code = option.value.toLowerCase();
      return label.includes(normalized) || code.includes(normalized);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlightIndex(0);
      return;
    }
    setHighlightIndex(0);
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    setHighlightIndex((current) => {
      if (filtered.length === 0) return 0;
      return Math.min(current, filtered.length - 1);
    });
  }, [filtered.length]);

  const selectOption = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filtered.length === 0) return;
      setHighlightIndex((current) => (current + 1) % filtered.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filtered.length === 0) return;
      setHighlightIndex((current) => (current - 1 + filtered.length) % filtered.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[highlightIndex];
      if (option) selectOption(option.value);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            triggerClassName,
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[60] w-[var(--radix-popover-trigger-width)] gap-2 p-2"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Input
          ref={searchInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={searchPlaceholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
        />
        <div
          id={listId}
          role="listbox"
          className="max-h-56 overflow-y-auto overscroll-contain"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightIndex;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                        isHighlighted && 'bg-muted',
                        !isHighlighted && 'hover:bg-muted/70'
                      )}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectOption(option.value)}
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{option.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
