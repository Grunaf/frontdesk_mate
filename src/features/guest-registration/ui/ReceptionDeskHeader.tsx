'use client';

import { type FormEvent, type KeyboardEvent, useId, useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { listStaysByBookingQuery } from '@/entities/guest-stay/lib/findStayByReference';
import {
  Button,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { RECEPTION_ISSUE_ACCESS_DESKTOP_CTA_LABEL } from './receptionIssueAccessCta';
import { ReceptionProfileSheet } from './ReceptionProfileSheet';

interface ReceptionDeskHeaderProps {
  tenantName: string;
  accountLabel: string;
  showBookingSearch: boolean;
  showNewBookingCta: boolean;
  staysForSearch: GuestStayRecordWithLink[];
  resolveBedLabel: (bedId: string) => string;
  onFindStayByRef: (stayId: string) => void;
  onNewBooking: () => void;
}

export function ReceptionDeskHeader({
  tenantName,
  accountLabel,
  showBookingSearch,
  showNewBookingCta,
  staysForSearch,
  resolveBedLabel,
  onFindStayByRef,
  onNewBooking,
}: ReceptionDeskHeaderProps) {
  const listboxId = useId();
  const [profileOpen, setProfileOpen] = useState(false);
  const [refQuery, setRefQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [emptyHint, setEmptyHint] = useState(false);

  const matches = useMemo(
    () => listStaysByBookingQuery(staysForSearch, refQuery),
    [staysForSearch, refQuery]
  );

  const showDropdown = dropdownOpen && refQuery.trim().length > 0;

  const selectStay = (stayId: string) => {
    setEmptyHint(false);
    setDropdownOpen(false);
    onFindStayByRef(stayId);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refQuery.trim()) {
      setEmptyHint(false);
      setDropdownOpen(false);
      return;
    }

    if (matches.length === 1) {
      selectStay(matches[0]!.id);
      return;
    }

    if (matches.length === 0) {
      setEmptyHint(true);
      setDropdownOpen(true);
      return;
    }

    setEmptyHint(false);
    setDropdownOpen(true);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      if (refQuery.trim() && matches.length > 0) {
        setDropdownOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (!showDropdown) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (matches.length === 0) return;
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (matches.length === 0) return;
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setDropdownOpen(false);
      return;
    }

    if (event.key === 'Enter' && matches.length > 1) {
      const active = matches[activeIndex];
      if (active) {
        event.preventDefault();
        selectStay(active.id);
      }
    }
  };

  return (
    <>
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reception desk
            </p>
            <h1 className="truncate text-lg font-semibold sm:text-xl">{tenantName}</h1>
          </div>

          {showBookingSearch ? (
            <Popover
              open={showDropdown}
              onOpenChange={(open) => {
                if (!open) setDropdownOpen(false);
              }}
            >
              <PopoverAnchor asChild>
                <form className="relative w-1/2 min-w-0 max-w-md shrink" onSubmit={handleSubmit}>
                  <div
                    className={cn(
                      'flex w-full items-center gap-0.5 rounded-md border border-input bg-background pr-0.5',
                      'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30'
                    )}
                  >
                    <Input
                      aria-label="Search bookings"
                      aria-autocomplete="list"
                      aria-controls={listboxId}
                      aria-expanded={showDropdown}
                      role="combobox"
                      className="h-10 min-w-0 flex-1 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
                      placeholder="Search bookings"
                      value={refQuery}
                      onChange={(event) => {
                        setRefQuery(event.target.value);
                        setEmptyHint(false);
                        setActiveIndex(0);
                        setDropdownOpen(event.target.value.trim().length > 0);
                      }}
                      onFocus={() => {
                        if (refQuery.trim().length > 0) setDropdownOpen(true);
                      }}
                      onKeyDown={handleKeyDown}
                    />
                    <Button type="submit" size="sm" variant="ghost" className="shrink-0 px-2">
                      Find
                    </Button>
                  </div>
                </form>
              </PopoverAnchor>
              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-72 gap-0 p-1"
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                {matches.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    {emptyHint || refQuery.trim() ? 'No matching booking.' : null}
                  </p>
                ) : (
                  <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto">
                    {matches.map((stay, index) => {
                      const guestLabel = stay.guest_name?.trim() || 'Guest';
                      const stayRef = formatStayReference(stay.id);
                      const bedLabel = resolveBedLabel(stay.bed_id);
                      const active = index === activeIndex;
                      return (
                        <li key={stay.id} role="option" aria-selected={active}>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm',
                              active ? 'bg-muted' : 'hover:bg-muted/60'
                            )}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => selectStay(stay.id)}
                          >
                            <span className="truncate font-medium text-foreground">
                              {guestLabel}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {stayRef ? `#${stayRef}` : 'No ref'} · {bedLabel}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          ) : null}

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0"
            aria-label="Open profile"
            onClick={() => setProfileOpen(true)}
          >
            <UserRound aria-hidden />
          </Button>

          {showNewBookingCta ? (
            <Button
              type="button"
              size="lg"
              className="hidden shrink-0 lg:inline-flex"
              onClick={onNewBooking}
            >
              {RECEPTION_ISSUE_ACCESS_DESKTOP_CTA_LABEL}
            </Button>
          ) : null}
        </div>
      </header>

      <ReceptionProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        accountLabel={accountLabel}
        tenantName={tenantName}
      />
    </>
  );
}
