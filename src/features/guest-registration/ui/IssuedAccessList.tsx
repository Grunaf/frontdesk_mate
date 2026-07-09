'use client';

import { type FormEvent, useState } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { findStayByReference } from '@/entities/guest-stay/lib/findStayByReference';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import type { TenantSettings } from '@/entities/tenant';
import { formatReceptionBookingSourceSummary } from '@/entities/tenant';
import { formatReservationBookingBalanceListHint } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import {
  guestAccessStatusLabel,
  resolveGuestAccessStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import {
  filterIssuedAccess,
  formatDisplayDate,
  groupIssuedAccess,
  type IssuedAccessFilter,
} from '../lib/guestAccessDates';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Input,
  SegmentedChipBar,
} from '@/shared/ui';

interface IssuedAccessListProps {
  stays: GuestStayRecordWithLink[];
  filter: IssuedAccessFilter;
  onFilterChange: (filter: IssuedAccessFilter) => void;
  onOpenStayDetail: (stayId: string) => void;
  onFindStayByRef: (stayId: string) => void;
  revokeError: string | null;
  resolveBedLabel: (bedId: string) => string;
  tenantSettings?: TenantSettings;
}

const FILTER_ITEMS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'all', label: 'All' },
] as const;

const SECTIONS = [
  { key: 'inApp' as const, title: 'In app', defaultOpen: true },
  { key: 'arrivingToday' as const, title: 'Arriving today', defaultOpen: true },
  { key: 'scheduled' as const, title: 'Scheduled', defaultOpen: false },
  { key: 'otherActive' as const, title: 'Other active', defaultOpen: false },
] as const;

function StayRow({
  stay,
  resolveBedLabel,
  onOpenStayDetail,
  tenantSettings,
}: {
  stay: GuestStayRecordWithLink;
  resolveBedLabel: (bedId: string) => string;
  onOpenStayDetail: (stayId: string) => void;
  tenantSettings?: TenantSettings;
}) {
  const status = resolveGuestAccessStatus(stay);
  const stayRef = formatStayReference(stay.id);
  const checkInDay = stay.check_in_at.slice(0, 10);
  const checkOutDay = stay.check_out_at.slice(0, 10);
  const guestLabel = stay.guest_name?.trim();
  const bedLabel = resolveBedLabel(stay.bed_id);
  const bookingLine = formatReceptionBookingSourceSummary(
    tenantSettings,
    stay.booking_platform_id,
    stay.booking_external_id
  );
  const balanceHint = formatReservationBookingBalanceListHint(stay);

  return (
    <li id={`stay-${stay.id}`} className="rounded-lg border bg-background px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpenStayDetail(stay.id)}
        >
          <p className="truncate text-sm font-medium">
            {guestLabel ? `${guestLabel} · ` : ''}
            {bedLabel}
            {stayRef ? <span className="font-mono text-muted-foreground"> · #{stayRef}</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDisplayDate(checkInDay)} → {formatDisplayDate(checkOutDay)} ·{' '}
            {guestAccessStatusLabel(status)}
          </p>
          {bookingLine ? (
            <p className="text-[11px] text-muted-foreground">{bookingLine}</p>
          ) : null}
          {balanceHint ? (
            <p className="text-[11px] text-muted-foreground">{balanceHint}</p>
          ) : null}
          {!stay.magicLinkUrl ? (
            <p className="mt-1 text-xs text-muted-foreground">Link unavailable — re-issue access.</p>
          ) : null}
        </button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shrink-0"
          onClick={() => onOpenStayDetail(stay.id)}
        >
          Open
        </Button>
      </div>
    </li>
  );
}

export function IssuedAccessList({
  stays,
  filter,
  onFilterChange,
  onOpenStayDetail,
  onFindStayByRef,
  revokeError,
  resolveBedLabel,
  tenantSettings,
}: IssuedAccessListProps) {
  const [refQuery, setRefQuery] = useState('');
  const [refError, setRefError] = useState<string | null>(null);
  const filteredStays = filterIssuedAccess(stays, filter);
  const grouped = groupIssuedAccess(filteredStays);
  const hasAny = SECTIONS.some(({ key }) => grouped[key].length > 0);
  const defaultSections = SECTIONS.filter(
    ({ key, defaultOpen }) => defaultOpen && grouped[key].length > 0
  ).map(({ key }) => key);

  if (stays.length === 0) {
    return <p className="text-xs text-muted-foreground">No issued access yet.</p>;
  }

  const handleRefSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = findStayByReference(stays, refQuery);

    if (!match) {
      setRefError('No stay for this ref.');
      return;
    }

    setRefError(null);
    onFindStayByRef(match.id);
  };

  return (
    <div className="space-y-3">
      <form className="flex items-center gap-2" onSubmit={handleRefSearch}>
        <Input
          aria-label="Find stay by ref"
          className="h-9 font-mono text-sm"
          placeholder="Ref #XXXXXX"
          value={refQuery}
          onChange={(event) => {
            setRefQuery(event.target.value);
            if (refError) {
              setRefError(null);
            }
          }}
        />
        <Button type="submit" size="sm" variant="outline" className="shrink-0">
          Find
        </Button>
      </form>
      {refError ? <p className="text-xs text-destructive">{refError}</p> : null}

      <SegmentedChipBar
        ariaLabel="Filter issued access"
        items={[...FILTER_ITEMS]}
        value={filter}
        onValueChange={(id) => onFilterChange(id as IssuedAccessFilter)}
      />

      {revokeError ? (
        <p className="text-xs text-destructive">
          {revokeError === 'not_found'
            ? 'Access not found or already revoked.'
            : 'Could not revoke access. Check database connection.'}
        </p>
      ) : null}

      {!hasAny ? (
        <p className="text-xs text-muted-foreground">No issued access matches this filter.</p>
      ) : (
        <Accordion type="multiple" defaultValue={[...defaultSections]} className="border-none">
          {SECTIONS.map(({ key, title }) => {
            const sectionStays = grouped[key];
            if (sectionStays.length === 0) return null;

            return (
              <AccordionItem key={key} value={key} className="border-b border-border/60">
                <AccordionTrigger className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:no-underline">
                  {title} ({sectionStays.length})
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <ul className="space-y-2">
                    {sectionStays.map((stay) => (
                      <StayRow
                        key={stay.id}
                        stay={stay}
                        resolveBedLabel={resolveBedLabel}
                        onOpenStayDetail={onOpenStayDetail}
                        tenantSettings={tenantSettings}
                      />
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
