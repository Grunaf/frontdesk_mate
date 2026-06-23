'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import {
  guestAccessStatusLabel,
  resolveGuestAccessStatus,
  stayOverlapsBedNightRange,
} from '@/entities/guest-stay/lib/guestAccessIntervals';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  createGuestStayAction,
  listActiveGuestStaysAction,
  revokeGuestStayAction,
} from '../actions/receptionActions';
import { flattenBedInventory, resolveBedInventory } from '../lib/resolveBedInventory';
import { resolveGuestAccessPeriod } from '../lib/resolveGuestAccessPeriod';
import { BedInventoryGrid } from './BedInventoryGrid';
import { RevokeAccessDialog } from './RevokeAccessDialog';
import { MagicLinkCard } from './MagicLinkCard';
import { Button, Input, Label } from '@/shared/ui';

interface ReceptionCheckInPanelProps {
  tenantSlug: string;
  settings?: TenantSettings;
  initialStays: GuestStayRecordWithLink[];
}

function defaultCheckInDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultCheckOutDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function pickDefaultBedId(bedOptions: string[], unavailableBedIds: Set<string>): string {
  return bedOptions.find((id) => !unavailableBedIds.has(id)) ?? bedOptions[0] ?? '';
}

function isArrivingToday(checkInAt: string, now = new Date()): boolean {
  return checkInAt.slice(0, 10) === now.toISOString().slice(0, 10);
}

export function ReceptionCheckInPanel({
  tenantSlug,
  settings,
  initialStays,
}: ReceptionCheckInPanelProps) {
  const bedOptions = useMemo(() => listGuestStayBedIds(settings ?? {}), [settings]);
  const checkInTime = settings?.checkInTime ?? '14:00';
  const [stays, setStays] = useState(initialStays);
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState(defaultCheckInDate);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOutDate);
  const [error, setError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [expandedStayId, setExpandedStayId] = useState<string | null>(null);
  const [stayPins, setStayPins] = useState<Record<string, string>>({});
  const [pendingRevokeStayId, setPendingRevokeStayId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const accessPeriod = useMemo(
    () => resolveGuestAccessPeriod(checkInDate, checkOutDate, checkInTime),
    [checkInDate, checkOutDate, checkInTime]
  );

  const inventory = useMemo(() => resolveBedInventory(settings ?? {}, stays), [settings, stays]);

  const overlappingBedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bedId of bedOptions) {
      const overlaps = stays.some((stay) =>
        stayOverlapsBedNightRange(stay, bedId, accessPeriod.checkInAt, accessPeriod.checkOutAt)
      );
      if (overlaps) ids.add(bedId);
    }
    return ids;
  }, [accessPeriod.checkInAt, accessPeriod.checkOutAt, bedOptions, stays]);

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

  const refreshStays = useCallback(async () => {
    const updated = await listActiveGuestStaysAction(tenantSlug);
    setStays(updated);
    return updated;
  }, [tenantSlug]);

  const sortedStays = useMemo(() => {
    const now = new Date();
    const statusOrder = { in_app: 0, valid_unused: 1, scheduled: 2, ended: 3, revoked: 4 };

    return [...stays].sort((a, b) => {
      const aStatus = resolveGuestAccessStatus(a, now);
      const bStatus = resolveGuestAccessStatus(b, now);
      const aArriving = aStatus === 'valid_unused' && isArrivingToday(a.check_in_at, now);
      const bArriving = bStatus === 'valid_unused' && isArrivingToday(b.check_in_at, now);

      if (aArriving !== bArriving) return aArriving ? -1 : 1;
      if (statusOrder[aStatus] !== statusOrder[bStatus]) {
        return statusOrder[aStatus] - statusOrder[bStatus];
      }
      return new Date(a.check_in_at).getTime() - new Date(b.check_in_at).getTime();
    });
  }, [stays]);

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
      case 'db_unavailable':
        return 'Database unavailable. Run migrations and check SUPABASE_SECRET_KEY.';
      case 'unknown':
        return 'Something went wrong. Try again or check the server logs.';
      default:
        return code;
    }
  };

  const handleCreate = () => {
    setError(null);

    if (!bedId) {
      setError('Select a bed');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createGuestStayAction({
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

        setStays((current) => [stayWithLink, ...current]);
        setExpandedStayId(result.stay.id);
        setStayPins((current) => ({ ...current, [result.stay.id]: result.guestPin }));
        setGuestName('');

        const nextAvailable = availableBedIds.filter((id) => id !== bedId);
        setBedId(nextAvailable[0] ?? '');
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
      setPendingRevokeStayId(null);
    });
  };

  const handleViewOccupiedStay = (stayId: string) => {
    setExpandedStayId(stayId);
    document.getElementById(`stay-${stayId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (bedOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Configure beds in Guest app modules before issuing guest access.
      </p>
    );
  }

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

      <div className="rounded-xl border bg-card p-4">
        <BedInventoryGrid roomGroups={inventory.roomGroups} onViewOccupiedStay={handleViewOccupiedStay} />
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

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <h3 className="text-sm font-semibold">Issue guest access</h3>
          <p className="text-xs text-muted-foreground">
            Creates app access for the guest: QR link and 6-digit PIN. Does not replace your booking
            system.
          </p>
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

          <div className="space-y-1.5">
            <Label htmlFor="check-in-date">Valid from</Label>
            <Input
              id="check-in-date"
              type="date"
              value={checkInDate}
              onChange={(event) => setCheckInDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="check-out-date">Valid until</Label>
            <Input
              id="check-out-date"
              type="date"
              value={checkOutDate}
              onChange={(event) => setCheckOutDate(event.target.value)}
            />
          </div>

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
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <Button type="button" onClick={handleCreate} disabled={isPending || availableBedIds.length === 0}>
          {isPending ? 'Issuing…' : 'Issue access'}
        </Button>
      </div>

      {sortedStays.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Issued access</h3>
          {revokeError ? (
            <p className="text-xs text-destructive">
              {revokeError === 'not_found'
                ? 'Access not found or already revoked.'
                : 'Could not revoke access. Check database connection.'}
            </p>
          ) : null}
          <ul className="space-y-3">
            {sortedStays.map((stay) => {
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
                        onClick={() =>
                          setExpandedStayId((current) => (current === stay.id ? null : stay.id))
                        }
                      >
                        {expandedStayId === stay.id ? 'Hide link' : 'Show link'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => setPendingRevokeStayId(stay.id)}
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
        </div>
      ) : null}
    </div>
  );
}
