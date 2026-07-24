'use client';

import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayRecordCheckInDate, stayRecordCheckOutDate } from '@/entities/guest-stay';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import type { TenantSettings } from '@/entities/tenant';
import { formatReceptionBookingSourceSummary } from '@/entities/tenant';
import { formatReservationBookingBalanceListHint } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import {
  guestAccessCheckInPolicyFromSettings,
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
  SegmentedChipBar,
} from '@/shared/ui';

interface IssuedAccessListProps {
  stays: GuestStayRecordWithLink[];
  filter: IssuedAccessFilter;
  onFilterChange: (filter: IssuedAccessFilter) => void;
  onOpenStayDetail: (stayId: string) => void;
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
  const status = resolveGuestAccessStatus(stay, new Date(), guestAccessCheckInPolicyFromSettings(tenantSettings));
  const stayRef = formatStayReference(stay.id);
  const checkInDay = stayRecordCheckInDate(stay);
  const checkOutDay = stayRecordCheckOutDate(stay);
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
  revokeError,
  resolveBedLabel,
  tenantSettings,
}: IssuedAccessListProps) {
  const checkInPolicy = guestAccessCheckInPolicyFromSettings(tenantSettings);
  const filteredStays = filterIssuedAccess(stays, filter, new Date(), checkInPolicy);
  const grouped = groupIssuedAccess(filteredStays, new Date(), checkInPolicy);
  const hasAny = SECTIONS.some(({ key }) => grouped[key].length > 0);
  const defaultSections = SECTIONS.filter(
    ({ key, defaultOpen }) => defaultOpen && grouped[key].length > 0
  ).map(({ key }) => key);

  if (stays.length === 0) {
    return <p className="text-xs text-muted-foreground">No issued access yet.</p>;
  }

  return (
    <div className="space-y-3">
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
