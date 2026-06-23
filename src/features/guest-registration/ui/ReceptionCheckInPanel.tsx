'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import type { GuestStayRecordWithLink } from '@/entities/guest-stay';
import { listGuestStayBedIds } from '@/entities/guest-stay';
import type { TenantSettings } from '@/entities/tenant';
import {
  createGuestStayAction,
  listActiveGuestStaysAction,
  revokeGuestStayAction,
} from '../actions/receptionActions';
import { resolveBedInventory } from '../lib/resolveBedInventory';
import { BedInventoryGrid } from './BedInventoryGrid';
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

function pickDefaultBedId(bedOptions: string[], occupiedBedIds: Set<string>): string {
  return bedOptions.find((id) => !occupiedBedIds.has(id)) ?? bedOptions[0] ?? '';
}

export function ReceptionCheckInPanel({
  tenantSlug,
  settings,
  initialStays,
}: ReceptionCheckInPanelProps) {
  const bedOptions = useMemo(() => listGuestStayBedIds(settings ?? {}), [settings]);
  const [stays, setStays] = useState(initialStays);
  const [guestName, setGuestName] = useState('');
  const [checkInDate, setCheckInDate] = useState(defaultCheckInDate);
  const [checkOutDate, setCheckOutDate] = useState(defaultCheckOutDate);
  const [error, setError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [expandedStayId, setExpandedStayId] = useState<string | null>(null);
  const [stayPins, setStayPins] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const inventory = useMemo(() => resolveBedInventory(settings ?? {}, stays), [settings, stays]);

  const occupiedBedIds = useMemo(
    () => new Set(inventory.beds.filter((entry) => entry.status === 'occupied').map((entry) => entry.bedId)),
    [inventory.beds]
  );

  const availableBeds = useMemo(
    () => inventory.beds.filter((entry) => entry.status === 'free').map((entry) => entry.bedId),
    [inventory.beds]
  );

  const [bedId, setBedId] = useState(() => pickDefaultBedId(bedOptions, occupiedBedIds));

  const refreshStays = useCallback(async () => {
    const updated = await listActiveGuestStaysAction(tenantSlug);
    setStays(updated);
    return updated;
  }, [tenantSlug]);

  const createErrorMessage = (code: string): string => {
    switch (code) {
      case 'unauthorized':
        return 'Session expired — sign in again at reception desk.';
      case 'bed_occupied':
        return 'This bed already has an active stay.';
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
          if (result.error === 'bed_occupied') {
            const updated = await refreshStays();
            const nextOccupied = new Set(
              resolveBedInventory(settings ?? {}, updated)
                .beds.filter((entry) => entry.status === 'occupied')
                .map((entry) => entry.bedId)
            );
            setBedId(pickDefaultBedId(bedOptions, nextOccupied));
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

        const nextAvailable = availableBeds.filter((id) => id !== bedId);
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
    });
  };

  const handleSelectFreeBed = (nextBedId: string) => {
    setBedId(nextBedId);
    setError(null);
  };

  const handleViewOccupiedStay = (stayId: string) => {
    setExpandedStayId(stayId);
    document.getElementById(`stay-${stayId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (bedOptions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Configure beds in Guest app modules before issuing check-in links.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <BedInventoryGrid
          beds={inventory.beds}
          selectedBedId={bedId}
          onSelectFreeBed={handleSelectFreeBed}
          onViewOccupiedStay={handleViewOccupiedStay}
        />
      </div>

      {inventory.orphanStays.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Stays on unknown beds</p>
          <p className="text-xs">
            These active stays reference bed IDs missing from the room map. Fix the map in admin or revoke
            and re-issue access.
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
            Assign a bed and generate a QR link plus a 6-digit PIN for a paper slip.
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
            <Label htmlFor="check-in-date">Check-in date</Label>
            <Input
              id="check-in-date"
              type="date"
              value={checkInDate}
              onChange={(event) => setCheckInDate(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="check-out-date">Check-out date</Label>
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
              {availableBeds.length === 0 ? (
                <option value="">No free beds</option>
              ) : (
                availableBeds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <Button type="button" onClick={handleCreate} disabled={isPending || availableBeds.length === 0}>
          {isPending ? 'Generating…' : 'Generate QR, link & PIN'}
        </Button>
      </div>

      {stays.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Active stays</h3>
          {revokeError ? (
            <p className="text-xs text-destructive">
              {revokeError === 'not_found'
                ? 'Stay not found or already revoked.'
                : 'Could not revoke stay. Check database connection.'}
            </p>
          ) : null}
          <ul className="space-y-3">
            {stays.map((stay) => (
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
                      {stay.activated_at ? ' · activated' : ' · pending scan'}
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
                      onClick={() => handleRevoke(stay.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>

                {!stay.magicLinkUrl ? (
                  <p className="text-xs text-muted-foreground">
                    Link unavailable for this stay — revoke and issue a new one.
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
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
