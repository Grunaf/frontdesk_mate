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
import { Button, SegmentedChipBar } from '@/shared/ui';

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
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
] as const;

const SECTIONS = [
  { key: 'inApp' as const, title: 'In app' },
  { key: 'arrivingToday' as const, title: 'Arriving today' },
  { key: 'scheduled' as const, title: 'Scheduled' },
  { key: 'otherActive' as const, title: 'Other active' },
];

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

  if (stays.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Issued access</h3>
        <SegmentedChipBar
          ariaLabel="Filter issued access"
          items={[...FILTER_ITEMS]}
          value={filter}
          onValueChange={(id) => onFilterChange(id as IssuedAccessFilter)}
        />
      </div>

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
        <div className="space-y-4">
          {SECTIONS.map(({ key, title }) => {
            const sectionStays = grouped[key];
            if (sectionStays.length === 0) return null;

            return (
              <section key={key} className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {title}
                </h4>
                <ul className="space-y-3">
                  {sectionStays.map((stay) => {
                    const status = resolveGuestAccessStatus(stay);
                    return (
                      <li
                        key={stay.id}
                        id={`stay-${stay.id}`}
                        className="space-y-3 rounded-lg border bg-background p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {stay.guest_name ? `${stay.guest_name} · ` : ''}
                              {stay.bed_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(stay.check_in_at).toLocaleDateString()} →{' '}
                              {new Date(stay.check_out_at).toLocaleDateString()}
                              {' · '}
                              {guestAccessStatusLabel(status)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={!stay.magicLinkUrl}
                              onClick={() => onToggleExpanded(stay.id)}
                            >
                              {expandedStayId === stay.id ? 'Hide link' : 'Show link'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => onChangeDates(stay)}
                            >
                              Change dates
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() => onRevoke(stay.id)}
                            >
                              Revoke access
                            </Button>
                          </div>
                        </div>

                        {!stay.magicLinkUrl ? (
                          <p className="text-xs text-muted-foreground">
                            Link unavailable — revoke access and issue again.
                          </p>
                        ) : null}

                        {expandedStayId === stay.id && stay.magicLinkUrl ? (
                          <MagicLinkCard
                            magicLinkUrl={stay.magicLinkUrl}
                            bedId={stay.bed_id}
                            guestName={stay.guest_name ?? undefined}
                            guestPin={stayPins[stay.id]}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
