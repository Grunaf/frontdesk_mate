'use client';

import type { ReactNode } from 'react';
import { useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { formatStayReference } from '@/entities/guest-stay/lib/formatStayReference';
import { formatReservationBookingBalanceSummary } from '@/entities/guest-stay/lib/formatReservationBookingBalance';
import { setGuestReservationBookingPaidAction } from '../actions/receptionActions';
import { formatPartySheetMeta } from '../lib/guestAccessDates';
import { resolvePartyBookingBlockers } from '../lib/resolvePartyBookingBlockers';
import {
  resolveTourismTabBadge,
  type TourismStatusBadge,
} from '../lib/resolveStayDetailTabBadge';
import { resolvePartyLeadName, resolvePartyTitle } from '../lib/resolvePartyTitle';
import { BookingGroupIcon } from './BookingGroupIcon';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

export type PartySheetTabId = 'booking' | 'beds';

function isStayAdmitted(stay: GuestStayRecordWithLink): boolean {
  return Boolean(stay.passport_checked_at || stay.desk_checked_in_at);
}

function PartyStatusDot({ tone }: { tone: 'none' | 'muted' | 'amber' | 'emerald' }) {
  if (tone === 'none') return null;
  return (
    <span
      aria-hidden
      className={cn(
        'size-1.5 shrink-0 rounded-full',
        tone === 'amber' && 'bg-amber-500',
        tone === 'emerald' && 'bg-emerald-500',
        tone === 'muted' && 'bg-muted-foreground/50'
      )}
    />
  );
}

export function StayPartyBalanceControls({
  balanceStay,
  tenantSlug,
  onStayUpdated,
}: {
  balanceStay: GuestStayRecordWithLink;
  tenantSlug: string;
  onStayUpdated?: (stay: GuestStayRecordWithLink) => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startAction] = useTransition();

  const summary = formatReservationBookingBalanceSummary(balanceStay);
  const hasBalance =
    balanceStay.booking_amount_due_minor != null && balanceStay.booking_amount_currency;
  const isPaid = Boolean(balanceStay.booking_paid_at);

  const handleTogglePaid = () => {
    startAction(async () => {
      setActionError(null);
      const result = await setGuestReservationBookingPaidAction({
        tenantSlug,
        stayId: balanceStay.id,
        paid: !isPaid,
      });
      if (!result.ok) {
        setActionError(
          result.error === 'no_balance_recorded'
            ? 'No stay balance recorded.'
            : result.error === 'unauthorized'
              ? 'Sign in again at reception desk.'
              : 'Could not update payment status.'
        );
        return;
      }

      onStayUpdated?.({
        ...balanceStay,
        ...result.stay,
        magicLinkUrl: balanceStay.magicLinkUrl,
      });
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Balance
      </p>
      <p className="text-sm">{hasBalance && summary ? summary : 'No balance'}</p>
      {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
      {hasBalance ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7"
          disabled={isPending}
          onClick={handleTogglePaid}
        >
          {isPaid ? 'Mark unpaid' : 'Mark paid'}
        </Button>
      ) : null}
    </div>
  );
}

export function StayPartySheetTabsList() {
  return (
    <TabsList variant="line" className="w-full justify-start">
      <TabsTrigger value="booking">Booking</TabsTrigger>
      <TabsTrigger value="beds">Beds</TabsTrigger>
    </TabsList>
  );
}

export type StayPartyBookingTabProps = {
  partyStays: GuestStayRecordWithLink[];
  balanceStay: GuestStayRecordWithLink;
  tenantSlug?: string;
  onStayBookingBalanceChange?: (stay: GuestStayRecordWithLink) => void;
  contactSlot?: ReactNode;
  noteSlot?: ReactNode;
  showTourismSummary?: boolean;
  tourismByStayId?: Record<string, TourismStatusBadge>;
};

/** Group booking overview (no beds list). Dates/source live under party title chrome. */
export function StayPartyBookingTab({
  partyStays,
  balanceStay,
  tenantSlug,
  onStayBookingBalanceChange,
  contactSlot,
  noteSlot,
  showTourismSummary = false,
  tourismByStayId = {},
}: StayPartyBookingTabProps) {
  if (partyStays.length <= 1) return null;

  const accessInCount = partyStays.filter(isStayAdmitted).length;
  const tourismReadyCount = partyStays.filter(
    (member) => tourismByStayId[member.id] === 'complete'
  ).length;
  const blockers = resolvePartyBookingBlockers({
    partyStays,
    showTourismSummary,
    tourismByStayId,
  });

  return (
    <div className="space-y-3">
      {tenantSlug ? (
        <StayPartyBalanceControls
          balanceStay={balanceStay}
          tenantSlug={tenantSlug}
          onStayUpdated={onStayBookingBalanceChange}
        />
      ) : null}

      {contactSlot}

      <div className="space-y-1.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Readiness
        </p>
        {showTourismSummary ? (
          <p className="text-sm">
            Tourism ready {tourismReadyCount}/{partyStays.length}
          </p>
        ) : null}
        <p className="text-sm">
          Access in {accessInCount}/{partyStays.length}
        </p>
        {blockers ? <p className="text-xs text-amber-800">{blockers}</p> : null}
      </div>

      {noteSlot}
    </div>
  );
}

export type StayPartyBedsTabProps = {
  partyStays: GuestStayRecordWithLink[];
  activeStayId: string;
  resolveBedLabel: (bedId: string) => string;
  onSelectStay: (stayId: string) => void;
  showTourismSummary?: boolean;
  tourismByStayId?: Record<string, TourismStatusBadge>;
};

/** Dispatch list: open a bed for deep work. */
export function StayPartyBedsTab({
  partyStays,
  activeStayId,
  resolveBedLabel,
  onSelectStay,
  showTourismSummary = false,
  tourismByStayId = {},
}: StayPartyBedsTabProps) {
  if (partyStays.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Open a bed for tourism, access, or room key
      </p>
      <ul className="space-y-1.5">
        {partyStays.map((member, index) => {
          const guestLabel = member.guest_name?.trim() || `Guest ${index + 1}`;
          const bedLabel = resolveBedLabel(member.bed_id);
          const ref = formatStayReference(member.id);
          const isActive = member.id === activeStayId;
          const admitted = isStayAdmitted(member);
          const tourismTone = showTourismSummary
            ? resolveTourismTabBadge(tourismByStayId[member.id] ?? 'not_started')
            : 'none';
          return (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => onSelectStay(member.id)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm',
                  isActive
                    ? 'border-primary/40 bg-primary/5'
                    : 'bg-card hover:bg-muted/40'
                )}
              >
                <span className="min-w-0 truncate font-medium">
                  {guestLabel}
                  <span className="font-normal text-muted-foreground"> · {bedLabel}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {showTourismSummary ? <PartyStatusDot tone={tourismTone} /> : null}
                  <PartyStatusDot tone={admitted ? 'emerald' : 'muted'} />
                  {admitted ? (
                    <span className="text-emerald-700">In</span>
                  ) : (
                    <span>Expected</span>
                  )}
                  {ref ? <span className="font-mono">#{ref}</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type StayPartyMobilePanelProps = StayPartyBookingTabProps &
  StayPartyBedsTabProps & {
    tab: PartySheetTabId;
    onTabChange: (tab: PartySheetTabId) => void;
  };

/**
 * Mobile party root: own Tabs root (Booking | Beds).
 * Must not share the child stay Tabs namespace (stay/tourism/access).
 */
export function StayPartyMobilePanel({
  tab,
  onTabChange,
  partyStays,
  activeStayId,
  balanceStay,
  resolveBedLabel,
  onSelectStay,
  tenantSlug,
  onStayBookingBalanceChange,
  contactSlot,
  noteSlot,
  showTourismSummary = false,
  tourismByStayId = {},
}: StayPartyMobilePanelProps) {
  if (partyStays.length <= 1) return null;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as PartySheetTabId)}
      className="flex flex-col gap-3"
    >
      <StayPartySheetTabsList />
      <TabsContent value="booking" className="mt-0 outline-none">
        <StayPartyBookingTab
          partyStays={partyStays}
          balanceStay={balanceStay}
          tenantSlug={tenantSlug}
          onStayBookingBalanceChange={onStayBookingBalanceChange}
          contactSlot={contactSlot}
          noteSlot={noteSlot}
          showTourismSummary={showTourismSummary}
          tourismByStayId={tourismByStayId}
        />
      </TabsContent>
      <TabsContent value="beds" className="mt-0 outline-none">
        <StayPartyBedsTab
          partyStays={partyStays}
          activeStayId={activeStayId}
          resolveBedLabel={resolveBedLabel}
          onSelectStay={onSelectStay}
          showTourismSummary={showTourismSummary}
          tourismByStayId={tourismByStayId}
        />
      </TabsContent>
    </Tabs>
  );
}

export type StayPartyPeekProps = {
  partyStays: GuestStayRecordWithLink[];
  activeStayId: string;
  balanceStay: GuestStayRecordWithLink;
  checkInDate: string;
  checkOutDate: string;
  bookingSourceLine?: string | null;
  resolveBedLabel: (bedId: string) => string;
  onSelectStay: (stayId: string) => void;
  tenantSlug?: string;
  onStayBookingBalanceChange?: (stay: GuestStayRecordWithLink) => void;
  contactSlot?: ReactNode;
  noteSlot?: ReactNode;
  showTourismSummary?: boolean;
  tourismByStayId?: Record<string, TourismStatusBadge>;
  showCheckInParty: boolean;
  checkInPartyDisabled?: boolean;
  checkInPartyPending?: boolean;
  checkInPartyHint?: string | null;
  checkInPartyError?: string | null;
  onCheckInParty: () => void;
};

export function StayPartyPeek({
  partyStays,
  activeStayId,
  balanceStay,
  checkInDate,
  checkOutDate,
  bookingSourceLine,
  resolveBedLabel,
  onSelectStay,
  tenantSlug,
  onStayBookingBalanceChange,
  contactSlot,
  noteSlot,
  showTourismSummary = false,
  tourismByStayId = {},
  showCheckInParty,
  checkInPartyDisabled = false,
  checkInPartyPending = false,
  checkInPartyHint = null,
  checkInPartyError = null,
  onCheckInParty,
}: StayPartyPeekProps) {
  const [tab, setTab] = useState<PartySheetTabId>('booking');

  if (partyStays.length <= 1) return null;

  const leadName = resolvePartyLeadName(partyStays) || 'Guest';
  const partyTitle = resolvePartyTitle(leadName, partyStays.length);
  const partyMeta = formatPartySheetMeta(checkInDate, checkOutDate, bookingSourceLine);
  const showFooter = showCheckInParty && tab === 'booking';

  return (
    <aside
      aria-label={partyTitle}
      className="flex h-full w-80 flex-col overflow-hidden rounded-xl border bg-background shadow-lg"
    >
      <div className="shrink-0 space-y-1 border-b border-border/60 px-4 py-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
          <BookingGroupIcon className="text-foreground/70" />
          <span className="truncate">{partyTitle}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">{partyMeta}</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as PartySheetTabId)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-border/60 px-3 pt-2 pb-2">
          <StayPartySheetTabsList />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <TabsContent value="booking" className="mt-0 outline-none">
            <StayPartyBookingTab
              partyStays={partyStays}
              balanceStay={balanceStay}
              tenantSlug={tenantSlug}
              onStayBookingBalanceChange={onStayBookingBalanceChange}
              contactSlot={contactSlot}
              noteSlot={noteSlot}
              showTourismSummary={showTourismSummary}
              tourismByStayId={tourismByStayId}
            />
          </TabsContent>
          <TabsContent value="beds" className="mt-0 outline-none">
            <StayPartyBedsTab
              partyStays={partyStays}
              activeStayId={activeStayId}
              resolveBedLabel={resolveBedLabel}
              onSelectStay={onSelectStay}
              showTourismSummary={showTourismSummary}
              tourismByStayId={tourismByStayId}
            />
          </TabsContent>
        </div>
      </Tabs>

      {showFooter ? (
        <div className="shrink-0 space-y-2 border-t border-border/60 px-3 py-3">
          {checkInPartyHint ? (
            <p className="text-xs text-muted-foreground">{checkInPartyHint}</p>
          ) : null}
          {checkInPartyError ? (
            <p className="text-xs text-destructive">{checkInPartyError}</p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={checkInPartyDisabled || checkInPartyPending}
            onClick={onCheckInParty}
          >
            {checkInPartyPending ? 'Checking in…' : 'Check in all'}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
