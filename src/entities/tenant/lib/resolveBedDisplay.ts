import { applyBedUnitType, resolveBedUnitType } from '@/entities/room/model/bed-type';
import type { GuestStayConfig, StayBed } from '../model/guestStay';
import type { TenantSettings } from '../model/settings';

export interface BedPickerOption {
  value: string;
  label: string;
  /** Stable unique key for React lists (value alone may repeat across legacy data). */
  key: string;
}

export type BedMapTier = 'unit' | 'top' | 'bottom';

function bedsInRoom(beds: StayBed[], roomId: string): StayBed[] {
  return beds.filter((bed) => bed.roomId === roomId);
}

export function resolveBedSlotNumber(beds: StayBed[], bed: StayBed, roomId: string): number {
  const roomBeds = bedsInRoom(beds, roomId);
  const index = roomBeds.findIndex((entry) => entry.id === bed.id);
  return index >= 0 ? index + 1 : roomBeds.length + 1;
}

function findBedByGuestId(guestStay: GuestStayConfig | undefined, bedId: string): StayBed | null {
  const beds = guestStay?.beds ?? [];
  return (
    beds.find(
      (bed) => bed.id === bedId || bed.topId === bedId || bed.bottomId === bedId
    ) ?? null
  );
}

export function resolveTierForGuestId(bed: StayBed, bedId: string): 'upper' | 'lower' | undefined {
  if (resolveBedUnitType(bed) !== 'bunk') return undefined;
  if (bed.topId === bedId) return 'upper';
  if (bed.bottomId === bedId) return 'lower';
  return undefined;
}

function formatContextLabel(input: {
  roomLabel: string;
  slotNumber: number;
  floorLabel: string;
  tier?: 'upper' | 'lower';
}): string {
  const bedPart =
    input.tier === 'upper'
      ? `Bed ${input.slotNumber} · Upper`
      : input.tier === 'lower'
        ? `Bed ${input.slotNumber} · Lower`
        : `Bed ${input.slotNumber}`;
  return `${input.roomLabel} · ${bedPart} · Floor ${input.floorLabel}`;
}

export type StayLabelKind = 'floor' | 'room';

const STAY_LABEL_PREFIX: Record<StayLabelKind, RegExp> = {
  floor: /^Floor\s+/i,
  room: /^Room\s+/i,
};

export function normalizeStayLabel(
  kind: StayLabelKind,
  label: string | undefined
): string | undefined {
  if (!label?.trim()) return label;
  return label.trim().replace(STAY_LABEL_PREFIX[kind], '');
}

export function normalizeGuestStayLabels(guestStay: GuestStayConfig): GuestStayConfig {
  return {
    ...guestStay,
    floors: guestStay.floors?.map((floor) => ({
      ...floor,
      label: normalizeStayLabel('floor', floor.label) ?? floor.label,
    })),
    rooms: guestStay.rooms?.map((room) => ({
      ...room,
      label: normalizeStayLabel('room', room.label) ?? room.label,
    })),
  };
}

export function normalizeGuestStayForSave(guestStay: GuestStayConfig): GuestStayConfig {
  const labeled = normalizeGuestStayLabels(guestStay);
  const result = dedupeGuestStayBedIds(labeled);
  if (result.tourismRegistrationRequired !== true) {
    const { tourismRegistrationRequired: _omit, ...rest } = result;
    return rest;
  }
  return result;
}

export function resolveBedPickerOptions(guestStay: GuestStayConfig | undefined): BedPickerOption[] {
  const floors = guestStay?.floors ?? [];
  const rooms = guestStay?.rooms ?? [];
  const beds = guestStay?.beds ?? [];
  const options: BedPickerOption[] = [];

  for (const bed of beds) {
    if (!bed.id?.trim() || !bed.roomId?.trim()) continue;

    const room = rooms.find((entry) => entry.id === bed.roomId);
    if (!room?.label?.trim()) continue;

    const floor = floors.find((entry) => entry.id === room.floorId);
    const floorLabel = floor?.label?.trim() || floor?.id || room.floorId;
    const slot = resolveBedSlotNumber(beds, bed, bed.roomId);
    const bedType = resolveBedUnitType(bed);

    if (bedType === 'bunk') {
      if (bed.topId?.trim()) {
        const value = bed.topId.trim();
        options.push({
          value,
          key: `${bed.roomId}:top:${value}`,
          label: formatContextLabel({
            roomLabel: room.label,
            slotNumber: slot,
            floorLabel,
            tier: 'upper',
          }),
        });
      }
      if (bed.bottomId?.trim()) {
        const value = bed.bottomId.trim();
        options.push({
          value,
          key: `${bed.roomId}:bottom:${value}`,
          label: formatContextLabel({
            roomLabel: room.label,
            slotNumber: slot,
            floorLabel,
            tier: 'lower',
          }),
        });
      }
      continue;
    }

    const value = bed.id.trim();
    options.push({
      value,
      key: `${bed.roomId}:${value}`,
      label: formatContextLabel({
        roomLabel: room.label,
        slotNumber: slot,
        floorLabel,
      }),
    });
  }

  return options;
}

/** Renames duplicate legacy bed ids (e.g. bed_2 in two rooms) to room-scoped ids. */
export function dedupeGuestStayBedIds(guestStay: GuestStayConfig): GuestStayConfig {
  const beds = guestStay.beds ?? [];
  if (beds.length === 0) return guestStay;

  const usedIds = new Set<string>();

  function nextUniqueId(roomId: string): string {
    let index = 1;
    while (usedIds.has(`${roomId}_bed_${index}`)) {
      index += 1;
    }
    const id = `${roomId}_bed_${index}`;
    usedIds.add(id);
    return id;
  }

  function claimId(roomId: string, preferred: string): string {
    const trimmed = preferred.trim();
    if (trimmed && !usedIds.has(trimmed)) {
      usedIds.add(trimmed);
      return trimmed;
    }
    return nextUniqueId(roomId);
  }

  const normalizedBeds = beds.map((bed) => {
    if (!bed.roomId?.trim()) return bed;

    const id = claimId(bed.roomId, bed.id?.trim() || `${bed.roomId}_bed_1`);
    const bedType = resolveBedUnitType(bed);
    const tierFields = applyBedUnitType({ id }, bedType);

    return {
      ...bed,
      id,
      bedType: tierFields.bedType,
      topId: tierFields.topId,
      bottomId: tierFields.bottomId,
    };
  });

  return { ...guestStay, beds: normalizedBeds };
}

export function resolveBedDisplayLabel(
  settings: TenantSettings,
  bedId: string | null | undefined
): string | null {
  if (!bedId?.trim()) return null;

  const id = bedId.trim();
  const guestStay = settings.guestStay;
  const bed = findBedByGuestId(guestStay, id);
  if (!bed) return id;

  const tier = resolveTierForGuestId(bed, id);
  const slot = resolveBedSlotNumber(guestStay?.beds ?? [], bed, bed.roomId);

  if (tier === 'upper') return `${slot} · Upper`;
  if (tier === 'lower') return `${slot} · Lower`;
  return String(slot);
}

export function resolveBedMapDisplayLabel(
  guestStay: GuestStayConfig | undefined,
  bed: StayBed,
  tier: BedMapTier = 'unit'
): string {
  const slot = resolveBedSlotNumber(guestStay?.beds ?? [], bed, bed.roomId);
  const bedType = resolveBedUnitType(bed);

  if (bedType === 'bunk') {
    if (tier === 'top') return `${slot}↑`;
    if (tier === 'bottom') return String(slot);
  }

  return String(slot);
}
