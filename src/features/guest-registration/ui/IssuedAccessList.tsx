'use client';

import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  guestAccessStatusLabel,
  resolveGuestAccessStatus,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import {
  filterIssuedAccess,
  groupIssuedAccess,
  type IssuedAccessFilter,
} from '../lib/guestAccessDates';
import { MagicLinkCard } from './MagicLinkCard';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedChipBar,
} from '@/shared/ui';

interface IssuedAccessListProps {
  stays: GuestStayRecordWithLink[];
  filter: IssuedAccessFilter;
  onFilterChange: (filter: IssuedAccessFilter) => void;
  expandedStayId: string | null;
  onToggleExpanded: (stayId: string) => void;
  onRevoke: (stayId: string) => void;
  onChangeDates: (stay: GuestStayRecordWithLink) => void;
  stayPins: Record<string, string>;
  isPending: boolean;
  revokeError: string | null;
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
  expandedStayId,
  onToggleExpanded,
  onRevoke,
  onChangeDates,
  stayPins,
  isPending,
}: {
  stay: GuestStayRecordWithLink;
  expandedStayId: string | null;
  onToggleExpanded: (stayId: string) => void;
  onRevoke: (stayId: string) => void;
  onChangeDates: (stay: GuestStayRecordWithLink) => void;
  stayPins: Record<string, string>;
  isPending: boolean;
}) {
  const status = resolveGuestAccessStatus(stay);
  const isExpanded = expandedStayId === stay.id;

  return (
    <li id={`stay-${stay.id}`} className="space-y-2 rounded-lg border bg-background px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {stay.guest_name ? `${stay.guest_name} · ` : ''}
            {stay.bed_id}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(stay.check_in_at).toLocaleDateString()} →{' '}
            {new Date(stay.check_out_at).toLocaleDateString()} · {guestAccessStatusLabel(status)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!stay.magicLinkUrl}
            onClick={() => onToggleExpanded(stay.id)}
          >
            {isExpanded ? 'Hide' : 'PIN'}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" variant="outline" disabled={isPending}>
                ···
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-40 p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled={isPending}
                onClick={() => onChangeDates(stay)}
              >
                Change dates
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={() => onRevoke(stay.id)}
              >
                Revoke access
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {!stay.magicLinkUrl ? (
        <p className="text-xs text-muted-foreground">Link unavailable — re-issue access.</p>
      ) : null}

      {isExpanded && stay.magicLinkUrl ? (
        <MagicLinkCard
          magicLinkUrl={stay.magicLinkUrl}
          bedId={stay.bed_id}
          guestName={stay.guest_name ?? undefined}
          guestPin={stayPins[stay.id]}
        />
      ) : null}
    </li>
  );
}

export function IssuedAccessList({
  stays,
  filter,
  onFilterChange,
  expandedStayId,
  onToggleExpanded,
  onRevoke,
  onChangeDates,
  stayPins,
  isPending,
  revokeError,
}: IssuedAccessListProps) {
  const filteredStays = filterIssuedAccess(stays, filter);
  const grouped = groupIssuedAccess(filteredStays);
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
                        expandedStayId={expandedStayId}
                        onToggleExpanded={onToggleExpanded}
                        onRevoke={onRevoke}
                        onChangeDates={onChangeDates}
                        stayPins={stayPins}
                        isPending={isPending}
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
