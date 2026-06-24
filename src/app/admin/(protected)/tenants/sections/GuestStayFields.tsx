'use client';

import { useMemo, useRef, useState } from 'react';
import type { GuestStayConfig, StayBed, StayFloor, StayRoom, TenantSettings } from '@/entities/tenant';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import { dedupeGuestStayBedIds, normalizeGuestStayLabels, remapHighlightedBedIdAfterDedupe, resolveBedPickerOptions } from '@/entities/tenant/lib/resolveBedDisplay';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { cn } from '@/shared/lib/utils';
import { ChevronDown } from 'lucide-react';
import { RoomMapReadinessChecklist } from '../ui/RoomMapReadinessChecklist';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { RoomSetupCard } from '../ui/RoomSetupCard';

interface GuestStayFormState {
  roomMapEnabled: boolean;
  floors: StayFloor[];
  rooms: StayRoom[];
  beds: StayBed[];
  highlightedBedId: string;
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

function sanitizeHighlightedBedId(state: GuestStayFormState): string {
  if (!state.roomMapEnabled || !state.highlightedBedId.trim()) {
    return state.highlightedBedId;
  }

  const validValues = new Set(
    resolveBedPickerOptions(buildGuestStayConfig(state)).map((option) => option.value)
  );

  return validValues.has(state.highlightedBedId) ? state.highlightedBedId : '';
}

interface GuestStayFieldsProps {
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
  onChange,
  onRemove,
  canRemove,
}: {
  floor: StayFloor;
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
      <label className="block space-y-1">
        <span className="text-[11px] text-muted-foreground">Path photo URL</span>
        <input
          value={floor.pathImage ?? ''}
          onChange={(event) => onChange({ ...floor, pathImage: event.target.value })}
          placeholder="/images/corridor.jpg"
          className="w-full rounded-md border px-2.5 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}

export function GuestStayFields({ settings, readinessInput }: GuestStayFieldsProps) {
  const { updateDraft } = useTenantFormDraft();
  const initialGuestStay = useMemo(() => {
    const raw = settings?.guestStay ?? {};
    const labeled = normalizeGuestStayLabels(raw);
    const enabled = isRoomMapModuleEnabled(settings);

    if (!labeled.beds?.length) {
      return {
        floors: labeled.floors ?? [],
        rooms: labeled.rooms ?? [],
        beds: labeled.beds ?? [],
        highlightedBedId: enabled ? (settings?.highlightedBedId ?? '') : '',
      };
    }

    const normalized = dedupeGuestStayBedIds(labeled);
    return {
      floors: normalized.floors ?? [],
      rooms: normalized.rooms ?? [],
      beds: normalized.beds ?? [],
      highlightedBedId: enabled
        ? remapHighlightedBedIdAfterDedupe(settings?.highlightedBedId, labeled, normalized)
        : '',
    };
  }, [settings]);
  const initialEnabled = useMemo(() => isRoomMapModuleEnabled(settings), [settings]);

  const [roomMapEnabled, setRoomMapEnabled] = useState(initialEnabled);
  const [floors, setFloors] = useState<StayFloor[]>(
    initialGuestStay.floors.length ? initialGuestStay.floors : []
  );
  const [rooms, setRooms] = useState<StayRoom[]>(
    initialGuestStay.rooms.length ? initialGuestStay.rooms : []
  );
  const [beds, setBeds] = useState<StayBed[]>(initialGuestStay.beds.length ? initialGuestStay.beds : []);
  const [highlightedBedId, setHighlightedBedId] = useState(initialGuestStay.highlightedBedId);
  const [floorsOpen, setFloorsOpen] = useState(true);

  const guestStayStateRef = useRef<GuestStayFormState>({
    roomMapEnabled: initialEnabled,
    floors: initialGuestStay.floors.length ? initialGuestStay.floors : [],
    rooms: initialGuestStay.rooms.length ? initialGuestStay.rooms : [],
    beds: initialGuestStay.beds.length ? initialGuestStay.beds : [],
    highlightedBedId: initialGuestStay.highlightedBedId,
  });

  const readGuestStayState = (): GuestStayFormState => ({
    roomMapEnabled,
    floors,
    rooms,
    beds,
    highlightedBedId,
  });

  const commitGuestStayState = (next: GuestStayFormState) => {
    const sanitized: GuestStayFormState = {
      ...next,
      highlightedBedId: sanitizeHighlightedBedId(next),
    };

    guestStayStateRef.current = sanitized;
    setRoomMapEnabled(sanitized.roomMapEnabled);
    setFloors(sanitized.floors);
    setRooms(sanitized.rooms);
    setBeds(sanitized.beds);
    setHighlightedBedId(sanitized.highlightedBedId);
    updateDraft({
      roomMapEnabled: sanitized.roomMapEnabled,
      guestStay: buildGuestStayConfig(sanitized),
      highlightedBedId: sanitized.roomMapEnabled ? sanitized.highlightedBedId : '',
    });
  };

  const applyGuestStayState = (updater: (current: GuestStayFormState) => GuestStayFormState) => {
    commitGuestStayState(updater(guestStayStateRef.current));
  };

  const guestStay = useMemo<GuestStayConfig | undefined>(
    () => buildGuestStayConfig(readGuestStayState()),
    [roomMapEnabled, floors, rooms, beds]
  );
  const bedPickerOptions = useMemo(() => resolveBedPickerOptions(guestStay), [guestStay]);

  const handleToggleRoomMap = (enabled: boolean) => {
    if (!enabled) {
      const hasData =
        highlightedBedId.trim() ||
        floors.length > 0 ||
        rooms.length > 0 ||
        beds.length > 0;
      if (
        hasData &&
        !window.confirm('Turn off room map? This clears bed assignment and map data on save.')
      ) {
        return;
      }
      applyGuestStayState((current) => ({
        ...current,
        roomMapEnabled: false,
        floors: [],
        rooms: [],
        beds: [],
        highlightedBedId: '',
      }));
      return;
    }

    applyGuestStayState((current) => {
      if (!enabled) {
        return current;
      }

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
    highlightedBedId: roomMapEnabled ? highlightedBedId : undefined,
    guestStay,
  };

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
            When off, Find your bed is hidden. When on, complete all setup steps below.
          </span>
        </span>
      </label>

      {!roomMapEnabled ? (
        <p className="text-xs text-muted-foreground">
          Enable room map to configure bed assignment and wayfinding. Partial data is not saved.
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
                  floors={floors}
                  beds={beds}
                  guestStay={guestStay}
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
                  previewBedId={highlightedBedId}
                  onPreviewBedSelect={(bedId) =>
                    applyGuestStayState((current) => ({ ...current, highlightedBedId: bedId }))
                  }
                />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-primary/15 bg-primary/5 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              3 · Preview guest bed
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Which bed is highlighted in the app until booking sync is connected. Select on the map
              above or pick from the list.
            </p>

            {bedPickerOptions.length > 0 ? (
              <label className="block space-y-1.5">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  Preview bed
                  {isTenantFieldMissing('highlightedBedId', readinessInput) ? (
                    <span className="text-xs font-normal text-amber-700">Required for guests</span>
                  ) : null}
                </span>
                <select
                  value={highlightedBedId}
                  onChange={(event) =>
                    applyGuestStayState((current) => ({
                      ...current,
                      highlightedBedId: event.target.value,
                    }))
                  }
                  className={cn(
                    'w-full rounded-md border bg-background px-3 py-2 text-sm',
                    isTenantFieldMissing('highlightedBedId', readinessInput) &&
                      'border-amber-400 ring-1 ring-amber-200'
                  )}
                >
                  <option value="">Choose preview bed…</option>
                  {bedPickerOptions.map((option) => (
                    <option key={option.key} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                Place beds on the map above, then choose one here.
              </p>
            )}
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
