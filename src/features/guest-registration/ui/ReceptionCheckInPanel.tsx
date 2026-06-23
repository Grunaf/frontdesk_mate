'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { stayOverlapsBedNightRange } from '@/entities/guest-stay/lib/guestAccessIntervals';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  createGuestStayAction,
  listActiveGuestStaysAction,
  reissueGuestStayAction,
  revokeGuestStayAction,
} from '../actions/receptionActions';
import {
  addNights,
  defaultWalkInDates,
  formatDisplayDate,
  type GuestAccessFormMode,
  type IssuedAccessFilter,
  isValidAccessRange,
} from '../lib/guestAccessDates';
import { resolveBedInventory } from '../lib/resolveBedInventory';
import { resolveGuestAccessPeriod } from '../lib/resolveGuestAccessPeriod';
import { BedAccessCalendar } from './BedAccessCalendar';
import { BedInventoryGrid } from './BedInventoryGrid';
import { GuestAccessDateRange } from './GuestAccessDateRange';
import { IssuedAccessList } from './IssuedAccessList';
import { ReissueAccessDialog } from './ReissueAccessDialog';
import { RevokeAccessDialog } from './RevokeAccessDialog';
import { Button, Input, Label, SegmentedChipBar } from '@/shared/ui';

interface ReceptionCheckInPanelProps {
  tenantSlug: string;
  settings?: TenantSettings;
  initialStays: GuestStayRecordWithLink[];
}

interface ReissueDraft {
  stayId: string;
  guestName: string;
  bedId: string;
  checkInDate: string;
  checkOutDate: string;
}

const MODE_ITEMS = [
  { id: 'walk-in', label: 'Walk-in' },
  { id: 'custom', label: 'Custom dates' },
] as const;

function pickDefaultBedId(bedOptions: string[], unavailableBedIds: Set<string>): string {
  return bedOptions.find((id) => !unavailableBedIds.has(id)) ?? bedOptions[0] ?? '';
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function ReceptionCheckInPanel({
  tenantSlug,
  settings,
  initialStays,
}: ReceptionCheckInPanelProps) {
  const bedOptions = useMemo(() => listGuestStayBedIds(settings ?? {}), [settings]);
  const checkInTime = settings?.checkInTime ?? '14:00';
  const walkInDefaults = defaultWalkInDates();
  const issueFormRef = useRef<HTMLDivElement>(null);

  const [stays, setStays] = useState(initialStays);
  const [mode, setMode] = useState<GuestAccessFormMode>('walk-in');
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState(walkInDefaults.checkInDate);
  const [checkOutDate, setCheckOutDate] = useState(walkInDefaults.checkOutDate);
  const [issuedAccessFilter, setIssuedAccessFilter] = useState<IssuedAccessFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [expandedStayId, setExpandedStayId] = useState<string | null>(null);
  const [stayPins, setStayPins] = useState<Record<string, string>>({});
  const [pendingRevokeStayId, setPendingRevokeStayId] = useState<string | null>(null);
  const [pendingReissueStay, setPendingReissueStay] = useState<GuestStayRecordWithLink | null>(null);
  const [reissueDraft, setReissueDraft] = useState<ReissueDraft | null>(null);
  const [isPending, startTransition] = useTransition();

  const tenantSettings = settings ?? {};
  const rangeValid = isValidAccessRange(checkInDate, checkOutDate);

  const accessPeriod = useMemo(
    () => resolveGuestAccessPeriod(checkInDate, checkOutDate, checkInTime),
    [checkInDate, checkOutDate, checkInTime]
  );

  const inventory = useMemo(() => resolveBedInventory(tenantSettings, stays), [tenantSettings, stays]);

  const overlappingBedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bedId of bedOptions) {
      const overlaps = stays.some((stay) => {
        if (reissueDraft?.stayId === stay.id) return false;
        return stayOverlapsBedNightRange(stay, bedId, accessPeriod.checkInAt, accessPeriod.checkOutAt);
      });
      if (overlaps) ids.add(bedId);
    }
    return ids;
  }, [accessPeriod.checkInAt, accessPeriod.checkOutAt, bedOptions, reissueDraft?.stayId, stays]);

  const bedsByRoom = useMemo(() => {
    return inventory.roomGroups
      .map((group) => ({
        ...group,
        beds: group.beds.filter((entry) => !overlappingBedIds.has(entry.bedId)),
      }))
      .filter((group) => group.beds.length > 0);
  }, [inventory.roomGroups, overlappingBedIds]);

  const availableBedIds = useMemo(
    () => bedOptions.filter((id) => !overlappingBedIds.has(id)),
    [bedOptions, overlappingBedIds]
  );

  const [bedId, setBedId] = useState(() => pickDefaultBedId(bedOptions, overlappingBedIds));

  useEffect(() => {
    if (bedId && !overlappingBedIds.has(bedId)) return;
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  }, [bedId, bedOptions, overlappingBedIds]);

  const handleModeChange = (nextMode: string) => {
    if (reissueDraft) return;
    const resolvedMode = nextMode as GuestAccessFormMode;
    setMode(resolvedMode);
    if (resolvedMode === 'walk-in') {
      const nextDates = defaultWalkInDates();
      setCheckInDate(nextDates.checkInDate);
      setCheckOutDate(nextDates.checkOutDate);
    }
  };

  const refreshStays = useCallback(async () => {
    const updated = await listActiveGuestStaysAction(tenantSlug);
    setStays(updated);
    return updated;
  }, [tenantSlug]);

  const createErrorMessage = (code: string): string => {
    switch (code) {
      case 'unauthorized':
        return 'Session expired — sign in again at reception desk.';
      case 'access_overlap':
        return 'Another guest access overlaps these dates on this bed.';
      case 'bed_not_found':
        return 'Bed not found in room map configuration.';
      case 'tenant_not_found':
        return 'Hostel not found.';
      case 'not_found':
        return 'Access not found or already revoked.';
      case 'db_unavailable':
        return 'Database unavailable. Run migrations and check SUPABASE_SECRET_KEY.';
      case 'unknown':
        return 'Something went wrong. Try again or check the server logs.';
      default:
        return code;
    }
  };

  const clearReissueDraft = () => {
    setReissueDraft(null);
    setError(null);
    const nextDates = defaultWalkInDates();
    setMode('walk-in');
    setCheckInDate(nextDates.checkInDate);
    setCheckOutDate(nextDates.checkOutDate);
    setGuestName('');
    setBedId(pickDefaultBedId(bedOptions, overlappingBedIds));
  };

  const beginReissueDraft = (stay: GuestStayRecordWithLink) => {
    setReissueDraft({
      stayId: stay.id,
      guestName: stay.guest_name ?? '',
      bedId: stay.bed_id,
      checkInDate: toDateInput(stay.check_in_at),
      checkOutDate: toDateInput(stay.check_out_at),
    });
    setMode('custom');
    setGuestName(stay.guest_name ?? '');
    setCheckInDate(toDateInput(stay.check_in_at));
    setCheckOutDate(toDateInput(stay.check_out_at));
    setBedId(stay.bed_id);
    setError(null);
    issueFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSubmit = () => {
    setError(null);

    if (!rangeValid) {
      setError('Valid until must be on or after valid from.');
      return;
    }

    if (!bedId) {
      setError('Select a bed');
      return;
    }

    startTransition(async () => {
      try {
        const result = reissueDraft
          ? await reissueGuestStayAction({
              tenantSlug,
              stayId: reissueDraft.stayId,
              bedId,
              guestName: guestName.trim() || undefined,
              checkInDate,
              checkOutDate,
            })
          : await createGuestStayAction({
              tenantSlug,
              bedId,
              guestName: guestName.trim() || undefined,
              checkInDate,
              checkOutDate,
            });

        if (!result.ok) {
          setError(createErrorMessage(result.error));
          if (result.error === 'access_overlap') {
            await refreshStays();
          }
          return;
        }

        const stayWithLink: GuestStayRecordWithLink = {
          ...result.stay,
          magicLinkUrl: result.magicLinkUrl,
        };

        setStays((current) => {
          const withoutOld = reissueDraft
            ? current.filter((stay) => stay.id !== reissueDraft.stayId)
            : current;
          return [stayWithLink, ...withoutOld];
        });
        setExpandedStayId(result.stay.id);
        setStayPins((current) => {
          const next = { ...current, [result.stay.id]: result.guestPin };
          if (reissueDraft) {
            delete next[reissueDraft.stayId];
          }
          return next;
        });

        if (reissueDraft) {
          clearReissueDraft();
        } else {
          setGuestName('');
          const nextAvailable = availableBedIds.filter((id) => id !== bedId);
          setBedId(nextAvailable[0] ?? '');
        }
      } catch {
        setError('Something went wrong. Try again or check the server logs.');
      }
    });
  };

  const handleRevoke = (stayId: string) => {
    setRevokeError(null);

    startTransition(async () => {
      const result = await revokeGuestStayAction({ tenantSlug, stayId });
      if (!result.ok) {
        setRevokeError(result.error);
        return;
      }

      setStays((current) => current.filter((stay) => stay.id !== stayId));
      setStayPins((current) => {
        const next = { ...current };
        delete next[stayId];
        return next;
      });
      if (expandedStayId === stayId) {
        setExpandedStayId(null);
      }
      if (reissueDraft?.stayId === stayId) {
        clearReissueDraft();
      }
      setPendingRevokeStayId(null);
    });
  };

  const handleViewOccupiedStay = (stayId: string) => {
    setExpandedStayId(stayId);
    document.getElementById(`stay-${stayId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSelectFreeNight = (nextBedId: string, nightDate: string) => {
    if (reissueDraft) return;
    setMode('custom');
    setCheckInDate(nightDate);
    setCheckOutDate(addNights(nightDate, 1));
    setBedId(nextBedId);
    issueFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (bedOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Configure beds in Guest app modules before issuing guest access.
      </p>
    );
  }

  const bedsAvailabilityHint =
    mode === 'custom' && rangeValid
      ? availableBedIds.length === 0
        ? `No beds for ${formatDisplayDate(checkInDate)} – ${formatDisplayDate(checkOutDate)}`
        : `${availableBedIds.length} beds available for ${formatDisplayDate(checkInDate)} – ${formatDisplayDate(checkOutDate)}`
      : null;

  const reissueGuestLabel = reissueDraft?.guestName || pendingReissueStay?.guest_name || undefined;

  return (
    <div className="space-y-6">
      <RevokeAccessDialog
        open={pendingRevokeStayId !== null}
        isPending={isPending}
        onKeep={() => setPendingRevokeStayId(null)}
        onConfirm={() => {
          if (pendingRevokeStayId) {
            handleRevoke(pendingRevokeStayId);
          }
        }}
      />

      <ReissueAccessDialog
        open={pendingReissueStay !== null}
        guestLabel={pendingReissueStay?.guest_name ?? undefined}
        isPending={isPending}
        onCancel={() => setPendingReissueStay(null)}
        onConfirm={() => {
          if (pendingReissueStay) {
            beginReissueDraft(pendingReissueStay);
            setPendingReissueStay(null);
          }
        }}
      />

      <div className="rounded-xl border bg-card p-4">
        <BedInventoryGrid roomGroups={inventory.roomGroups} onViewOccupiedStay={handleViewOccupiedStay} />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <BedAccessCalendar
          settings={tenantSettings}
          stays={stays}
          onViewStay={handleViewOccupiedStay}
          onSelectFreeNight={handleSelectFreeNight}
        />
      </div>

      {inventory.orphanStays.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Access on unknown beds</p>
          <p className="text-xs">
            These issued access records reference bed IDs missing from the room map. Fix the map in
            admin or revoke access and issue again.
          </p>
          <ul className="space-y-1 text-xs">
            {inventory.orphanStays.map((stay) => (
              <li key={stay.id}>
                {stay.guest_name ? `${stay.guest_name} · ` : ''}
                {stay.bed_id}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div ref={issueFormRef} className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Issue guest access</h3>
            <p className="text-xs text-muted-foreground">
              Creates app access for the guest: QR link and 6-digit PIN. Does not replace your booking
              system.
            </p>
          </div>

          {reissueDraft ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Re-issuing access for {reissueGuestLabel || 'guest'} — they will get a new PIN and link.
              </p>
              <Button type="button" size="sm" variant="outline" onClick={clearReissueDraft}>
                Cancel re-issue
              </Button>
            </div>
          ) : null}

          <SegmentedChipBar
            ariaLabel="Issue access mode"
            items={[...MODE_ITEMS]}
            value={mode}
            onValueChange={handleModeChange}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="guest-name">Guest name (optional)</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Alex"
              autoComplete="off"
            />
          </div>

          {mode === 'custom' ? (
            <GuestAccessDateRange
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              onChange={({ checkInDate: nextFrom, checkOutDate: nextUntil }) => {
                setCheckInDate(nextFrom);
                setCheckOutDate(nextUntil);
              }}
            />
          ) : (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Walk-in: access from today through tomorrow. Switch to Custom dates for a longer stay.
            </p>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bed-id">Bed</Label>
            <select
              id="bed-id"
              value={bedId}
              onChange={(event) => setBedId(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {bedsByRoom.length === 0 ? (
                <option value="">No beds for these dates</option>
              ) : (
                bedsByRoom.map((group) => (
                  <optgroup key={group.roomId} label={group.roomLabel}>
                    {group.beds.map((entry) => (
                      <option key={entry.bedId} value={entry.bedId}>
                        {entry.displayLabel} ({entry.bedId})
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
            {bedsAvailabilityHint ? (
              <p className="text-xs text-muted-foreground">{bedsAvailabilityHint}</p>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !rangeValid || availableBedIds.length === 0}
        >
          {isPending
            ? reissueDraft
              ? 'Re-issuing…'
              : 'Issuing…'
            : reissueDraft
              ? 'Save new access'
              : 'Issue access'}
        </Button>
      </div>

      <IssuedAccessList
        stays={stays}
        filter={issuedAccessFilter}
        onFilterChange={setIssuedAccessFilter}
        expandedStayId={expandedStayId}
        onToggleExpanded={(stayId) =>
          setExpandedStayId((current) => (current === stayId ? null : stayId))
        }
        onRevoke={(stayId) => setPendingRevokeStayId(stayId)}
        onChangeDates={(stay) => setPendingReissueStay(stay)}
        stayPins={stayPins}
        isPending={isPending}
        revokeError={revokeError}
      />
    </div>
  );
}
