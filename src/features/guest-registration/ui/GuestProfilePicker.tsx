'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';

import type { GuestProfile } from '@/entities/guest';
import { Button, Input, Label } from '@/shared/ui';

import { searchGuestProfilesAction } from '../actions/receptionActions';

interface GuestProfilePickerProps {
  tenantSlug: string;
  guestName: string;
  onGuestNameChange: (value: string) => void;
  selectedGuestId: string | null;
  onSelectGuest: (guest: GuestProfile) => void;
  onClearGuest: () => void;
  disabled?: boolean;
}

export function GuestProfilePicker({
  tenantSlug,
  guestName,
  onGuestNameChange,
  selectedGuestId,
  onSelectGuest,
  onClearGuest,
  disabled = false,
}: GuestProfilePickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GuestProfile[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    const query = guestName.trim();
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const result = await searchGuestProfilesAction({ tenantSlug, query });
        if (!result.ok) {
          setLoadError('Could not search guests.');
          setItems([]);
          return;
        }
        setLoadError(null);
        setItems(result.items);
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [guestName, open, tenantSlug]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const selectedLabel = selectedGuestId
    ? items.find((item) => item.id === selectedGuestId)?.display_name ?? guestName
    : null;

  return (
    <div ref={rootRef} className="relative space-y-1">
      <Label htmlFor="guest-name">Booking name</Label>
      <p className="text-xs text-muted-foreground">
        The guest will see this name in the app. Type to find a returning guest.
      </p>
      <Input
        id="guest-name"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        value={guestName}
        onChange={(event) => {
          onGuestNameChange(event.target.value);
          if (selectedGuestId) onClearGuest();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Alex or passport number"
        autoComplete="off"
        required
        disabled={disabled}
      />
      {selectedGuestId ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Linked returning guest{selectedLabel ? `: ${selectedLabel}` : ''}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs"
            onClick={() => {
              onClearGuest();
              setOpen(true);
            }}
            disabled={disabled}
          >
            Clear
          </Button>
        </div>
      ) : null}
      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md"
        >
          {isPending ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : loadError ? (
            <p className="px-3 py-2 text-xs text-destructive">{loadError}</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No matches — a new guest profile will be created.
            </p>
          ) : (
            <ul className="py-1">
              {items.map((item) => {
                const passport = item.passport_number?.trim();
                const meta = [passport ? `Passport ${passport}` : null, item.citizenship]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.id === selectedGuestId}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        onSelectGuest(item);
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium">{item.display_name}</span>
                      {meta ? (
                        <span className="text-xs text-muted-foreground">{meta}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No passport on file</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
