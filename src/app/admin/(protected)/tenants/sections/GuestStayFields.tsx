'use client';

import { useMemo, useRef, useState } from 'react';
import type { GuestStayConfig, StayBed, StayFloor, StayRoom, TenantSettings } from '@/entities/tenant';
import { listStayOffersForAdmin } from '@/entities/tenant';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import { dedupeGuestStayBedIds, normalizeGuestStayLabels } from '@/entities/tenant/lib/resolveBedDisplay';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { cn } from '@/shared/lib/utils';
import { ChevronDown } from 'lucide-react';
import { RoomMapReadinessChecklist } from '../ui/RoomMapReadinessChecklist';
import { AdminImageField } from '../ui/AdminImageField';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { RoomSetupCard } from '../ui/RoomSetupCard';

interface GuestStayFormState {
  roomMapEnabled: boolean;
  floors: StayFloor[];
  rooms: StayRoom[];
  beds: StayBed[];
}

function buildGuestStayConfig(state: GuestStayFormState): GuestStayConfig | undefined {
  if (!state.roomMapEnabled) {
    return undefined;
  }

  return {
    floors: state.floors,
    rooms: state.rooms,
    beds: state.beds,
  };
}

interface GuestStayFieldsProps {
  tenantSlug: string;
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
}

function emptyFloor(index: number): StayFloor {
  return { id: String(index + 1), label: String(index + 1) };
}

function emptyRoom(index: number, floorId: string): StayRoom {
  return { id: `room_${index + 1}`, label: '', floorId };
}

function seedGuestStay(): { floors: StayFloor[]; rooms: StayRoom[]; beds: StayBed[] } {
  const floor = emptyFloor(0);
  return {
    floors: [floor],
    rooms: [emptyRoom(0, floor.id)],
    beds: [],
  };
}

function FloorEditor({
  floor,
  tenantSlug,
  onChange,
  onRemove,
  canRemove,
}: {
  floor: StayFloor;
  tenantSlug: string;
  onChange: (next: StayFloor) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Floor {floor.label || floor.id}</p>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs text-destructive hover:underline">
            Remove
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-[11px] text-muted-foreground">Guest label</span>
          <input
            value={floor.label ?? ''}
            onChange={(event) => onChange({ ...floor, label: event.target.value })}
            placeholder="1"
            className="w-full rounded-md border px-2.5 py-1.5 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">
            Guest app shows &quot;Floor {'{label}'}&quot; (localized).
          </span>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-[11px] text-muted-foreground">Path hint (after entering floor)</span>
        <textarea
          value={floor.pathHint ?? ''}
          onChange={(event) => onChange({ ...floor, pathHint: event.target.value })}
          rows={2}
          className="w-full rounded-md border px-2.5 py-1.5 text-sm"
        />
      </label>
      <AdminImageField
        label="Path photo (after entering floor)"
        tenantSlug={tenantSlug}
        kind="misc"
        value={floor.pathImage ?? ''}
        onChange={(next) => onChange({ ...floor, pathImage: next })}
        placeholder="/images/corridor.jpg"
        previewAlt={`Floor ${floor.label || floor.id} path`}
      />
    </div>
  );
}

export function GuestStayFields({ tenantSlug, settings, readinessInput }: GuestStayFieldsProps) {
  const { updateDraft } = useTenantFormDraft();
  const initialGuestStay = useMemo(() => {
    const raw = settings?.guestStay ?? {};
    const labeled = normalizeGuestStayLabels(raw);

    if (!labeled.beds?.length) {
      return {
        floors: labeled.floors ?? [],
        rooms: labeled.rooms ?? [],
        beds: labeled.beds ?? [],
      };
    }

    const normalized = dedupeGuestStayBedIds(labeled);
    return {
      floors: normalized.floors ?? [],
      rooms: normalized.rooms ?? [],
      beds: normalized.beds ?? [],
    };
  }, [settings]);
  const initialEnabled = useMemo(() => isRoomMapModuleEnabled(settings ?? {}), [settings]);

  const [roomMapEnabled, setRoomMapEnabled] = useState(initialEnabled);
  const [floors, setFloors] = useState<StayFloor[]>(
    initialGuestStay.floors.length ? initialGuestStay.floors : []
  );
  const [rooms, setRooms] = useState<StayRoom[]>(
    initialGuestStay.rooms.length ? initialGuestStay.rooms : []
  );
  const [beds, setBeds] = useState<StayBed[]>(initialGuestStay.beds.length ? initialGuestStay.beds : []);
  const [floorsOpen, setFloorsOpen] = useState(true);

  const guestStayStateRef = useRef<GuestStayFormState>({
    roomMapEnabled: initialEnabled,
    floors: initialGuestStay.floors.length ? initialGuestStay.floors : [],
    rooms: initialGuestStay.rooms.length ? initialGuestStay.rooms : [],
    beds: initialGuestStay.beds.length ? initialGuestStay.beds : [],
  });

  const readGuestStayState = (): GuestStayFormState => ({
    roomMapEnabled,
    floors,
    rooms,
    beds,
  });

  const commitGuestStayState = (next: GuestStayFormState) => {
    guestStayStateRef.current = next;
    setRoomMapEnabled(next.roomMapEnabled);
    setFloors(next.floors);
    setRooms(next.rooms);
    setBeds(next.beds);
    updateDraft({
      roomMapEnabled: next.roomMapEnabled,
      guestStay: buildGuestStayConfig(next),
    });
  };

  const applyGuestStayState = (updater: (current: GuestStayFormState) => GuestStayFormState) => {
    commitGuestStayState(updater(guestStayStateRef.current));
  };

  const guestStay = useMemo<GuestStayConfig | undefined>(
    () => buildGuestStayConfig(readGuestStayState()),
    [roomMapEnabled, floors, rooms, beds]
  );

  const handleToggleRoomMap = (enabled: boolean) => {
    if (!enabled) {
      const hasData = floors.length > 0 || rooms.length > 0 || beds.length > 0;
      if (hasData && !window.confirm('Turn off room map? This clears map data on save.')) {
        return;
      }
      applyGuestStayState((current) => ({
        ...current,
        roomMapEnabled: false,
        floors: [],
        rooms: [],
        beds: [],
      }));
      return;
    }

    applyGuestStayState((current) => {
      if (current.floors.length === 0 && current.rooms.length === 0) {
        const seed = seedGuestStay();
        return {
          ...current,
          roomMapEnabled: true,
          floors: seed.floors,
          rooms: seed.rooms,
          beds: seed.beds,
        };
      }

      return { ...current, roomMapEnabled: true };
    });
  };

  const previewSettings: TenantSettings = {
    ...(settings ?? {}),
    guestStay,
  };
  const stayOffers = listStayOffersForAdmin(settings ?? {});

  return (
    <div className="space-y-6">
      <label className="flex items-start gap-3 rounded-xl border bg-muted/20 px-4 py-3">
        <input
          type="checkbox"
          checked={roomMapEnabled}
          onChange={(event) => handleToggleRoomMap(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border"
        />
        <span>
          <span className="block text-sm font-medium">Room map for guests</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            When off, Find your bed is hidden. When on, complete all setup steps below. Guests see
            their assigned bed after check-in.
          </span>
        </span>
      </label>

      {!roomMapEnabled ? (
        <p className="text-xs text-muted-foreground">
          Enable room map to configure wayfinding. Partial data is not saved.
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setFloorsOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl border bg-muted/15 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-medium">1 · Building floors</p>
                <p className="text-xs text-muted-foreground">
                  Define floors before placing rooms. {floors.length} floor(s).
                </p>
              </div>
              <ChevronDown
                className={cn('size-4 shrink-0 transition-transform', floorsOpen && 'rotate-180')}
              />
            </button>

            {floorsOpen ? (
              <div className="space-y-3 pl-1">
                {floors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add at least one floor, then create rooms below.
                  </p>
                ) : null}
                {floors.map((floor, index) => (
                  <FloorEditor
                    key={`floor-${index}`}
                    floor={floor}
                    tenantSlug={tenantSlug}
                    canRemove={floors.length > 1}
                    onChange={(next) =>
                      applyGuestStayState((current) => ({
                        ...current,
                        floors: current.floors.map((item, i) => (i === index ? next : item)),
                      }))
                    }
                    onRemove={() =>
                      applyGuestStayState((current) => ({
                        ...current,
                        floors: current.floors.filter((_, i) => i !== index),
                      }))
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    applyGuestStayState((current) => ({
                      ...current,
                      floors: [...current.floors, emptyFloor(current.floors.length)],
                    }))
                  }
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Add floor
                </button>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <p className="text-sm font-medium">2 · Rooms & bed maps</p>
                <p className="text-xs text-muted-foreground">
                  Place beds on the map or add floor path / door photos in room details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  applyGuestStayState((current) => {
                    const floorId = current.floors[0]?.id ?? '1';
                    if (current.floors.length === 0) {
                      const seed = seedGuestStay();
                      return {
                        ...current,
                        floors: seed.floors,
                        rooms: [...current.rooms, emptyRoom(current.rooms.length, seed.floors[0].id)],
                      };
                    }

                    return {
                      ...current,
                      rooms: [...current.rooms, emptyRoom(current.rooms.length, floorId)],
                    };
                  });
                }}
                className="shrink-0 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Add room
              </button>
            </div>

            <div className="space-y-4">
              {rooms.map((room, index) => (
                <RoomSetupCard
                  key={`room-${index}`}
                  room={room}
                  tenantSlug={tenantSlug}
                  floors={floors}
                  beds={beds}
                  guestStay={guestStay}
                  stayOffers={stayOffers}
                  onRoomChange={(next) =>
                    applyGuestStayState((current) => ({
                      ...current,
                      rooms: current.rooms.map((item, i) => (i === index ? next : item)),
                    }))
                  }
                  onBedsChange={(nextBeds) =>
                    applyGuestStayState((current) => ({ ...current, beds: nextBeds }))
                  }
                  onRemove={() =>
                    applyGuestStayState((current) => ({
                      ...current,
                      rooms:
                        current.rooms.length <= 1
                          ? current.rooms
                          : current.rooms.filter((_, i) => i !== index),
                      beds: current.beds.filter((bed) => bed.roomId !== room.id),
                    }))
                  }
                />
              ))}
            </div>
          </section>

          <RoomMapReadinessChecklist
            cityPackId={readinessInput.cityPackId}
            settings={previewSettings}
            lifecycleStatus={readinessInput.lifecycleStatus}
          />
        </>
      )}
    </div>
  );
}
