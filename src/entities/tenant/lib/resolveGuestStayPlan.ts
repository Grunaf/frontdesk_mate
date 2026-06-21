import { resolveGuestBedId } from './resolveGuestBedId';
import { resolveBedDisplayLabel, resolveBedSlotNumber, resolveTierForGuestId } from './resolveBedDisplay';
import {
  stayBedHasLayout,
  toRoomLayoutBed,
  type RoomLayoutBed,
} from '@/entities/room/model/room-layout';
import { resolveRoomBounds } from '@/entities/room/model/room-layout';
import type { GuestStayPlan, GuestStayStep, GuestStayConfig, StayBed, StayFloor, StayRoom } from '../model/guestStay';
import type { TenantSettings } from '../model/settings';

function normalizeGuestStay(config: GuestStayConfig | undefined): Required<GuestStayConfig> {
  const floors =
    config?.floors
      ?.filter((floor) => floor.id?.trim())
      .map((floor) => ({
        id: floor.id.trim(),
        label: floor.label?.trim() || undefined,
        pathHint: floor.pathHint?.trim() || undefined,
        pathImage: floor.pathImage?.trim() || undefined,
      })) ?? [];

  const rooms =
    config?.rooms
      ?.filter((room) => room.id?.trim() && room.label?.trim() && room.floorId?.trim())
      .map((room) => ({
        id: room.id.trim(),
        label: room.label.trim(),
        floorId: room.floorId.trim(),
        doorImage: room.doorImage?.trim() || undefined,
        mapWidth: typeof room.mapWidth === 'number' ? room.mapWidth : undefined,
        mapHeight: typeof room.mapHeight === 'number' ? room.mapHeight : undefined,
        entranceSide: room.entranceSide,
      })) ?? [];

  const beds =
    config?.beds
      ?.filter((bed) => bed.id?.trim() && bed.roomId?.trim())
      .map((bed) => ({
        id: bed.id.trim(),
        roomId: bed.roomId.trim(),
        x: typeof bed.x === 'number' ? bed.x : undefined,
        y: typeof bed.y === 'number' ? bed.y : undefined,
        bedType: bed.bedType,
        topId: bed.topId?.trim() || undefined,
        bottomId: bed.bottomId?.trim() || undefined,
        rotation: bed.rotation,
      })) ?? [];

  return { floors, rooms, beds };
}

function findBed(stay: Required<GuestStayConfig>, bedId: string): StayBed | null {
  return (
    stay.beds.find(
      (bed) => bed.id === bedId || bed.topId === bedId || bed.bottomId === bedId
    ) ?? null
  );
}

function findRoom(stay: Required<GuestStayConfig>, roomId: string): StayRoom | null {
  return stay.rooms.find((room) => room.id === roomId) ?? null;
}

function findFloor(stay: Required<GuestStayConfig>, floorId: string): StayFloor | null {
  return stay.floors.find((floor) => floor.id === floorId) ?? null;
}

function resolveLayoutBedsForRoom(stay: Required<GuestStayConfig>, roomId: string): RoomLayoutBed[] {
  const layoutBeds: RoomLayoutBed[] = [];

  for (const bed of stay.beds) {
    if (bed.roomId !== roomId || !stayBedHasLayout(bed)) {
      continue;
    }

    layoutBeds.push(toRoomLayoutBed(bed));
  }

  return layoutBeds;
}

function buildSteps(floor: StayFloor | null, room: StayRoom | null): GuestStayStep[] {
  const steps: GuestStayStep[] = [];

  if (floor && (floor.pathImage || floor.pathHint)) {
    steps.push({
      id: `floor-${floor.id}`,
      kind: 'floor_path',
      label: floor.label ?? floor.id,
      imageSrc: floor.pathImage,
      hint: floor.pathHint,
    });
  }

  if (room?.doorImage) {
    steps.push({
      id: `room-${room.id}`,
      kind: 'room_door',
      label: room.label,
      imageSrc: room.doorImage,
    });
  }

  return steps;
}

export function resolveGuestFloorFromStay(settings: TenantSettings, bedId: string): string | null {
  const stay = normalizeGuestStay(settings.guestStay);
  const bed = findBed(stay, bedId);
  if (!bed) return null;

  const room = findRoom(stay, bed.roomId);
  return room?.floorId ?? null;
}

export function resolveGuestStayPlan(
  settings: TenantSettings,
  guestBedId?: string | null
): GuestStayPlan {
  const bedId = resolveGuestBedId(settings, guestBedId);
  const stay = normalizeGuestStay(settings.guestStay);

  const empty: GuestStayPlan = {
    bedId,
    bedLabel: bedId ? resolveBedDisplayLabel(settings, bedId) : null,
    bedSlot: null,
    bedTier: undefined,
    room: null,
    floor: null,
    layoutBeds: [],
    roomBounds: null,
    steps: [],
    hasContent: false,
  };

  if (!bedId) {
    return empty;
  }

  const bed = findBed(stay, bedId);
  const roomFromStay = bed ? findRoom(stay, bed.roomId) : null;
  const floorFromStay = roomFromStay ? findFloor(stay, roomFromStay.floorId) : null;
  const layoutBeds = roomFromStay ? resolveLayoutBedsForRoom(stay, roomFromStay.id) : [];
  const roomBounds = roomFromStay ? resolveRoomBounds(roomFromStay) : null;

  const room = roomFromStay
    ? {
        id: roomFromStay.id,
        label: roomFromStay.label,
        doorImage: roomFromStay.doorImage,
        entranceSide: roomFromStay.entranceSide,
      }
    : null;

  const floor = floorFromStay
    ? {
        id: floorFromStay.id,
        label: floorFromStay.label ?? floorFromStay.id,
        pathHint: floorFromStay.pathHint,
        pathImage: floorFromStay.pathImage,
      }
    : null;

  const steps = buildSteps(floorFromStay, roomFromStay);

  const bedTier = bed ? resolveTierForGuestId(bed, bedId) : undefined;
  const bedSlot = bed ? resolveBedSlotNumber(stay.beds, bed, bed.roomId) : null;

  const hasContent = Boolean(
    layoutBeds.length > 0 ||
      room?.doorImage ||
      floor?.pathHint ||
      floor?.pathImage ||
      bedId
  );

  return {
    bedId,
    bedLabel: resolveBedDisplayLabel(settings, bedId),
    bedSlot,
    bedTier,
    room,
    floor,
    layoutBeds,
    roomBounds,
    steps,
    hasContent,
  };
}

export function hasGuestStayConfigured(settings: TenantSettings): boolean {
  const stay = normalizeGuestStay(settings.guestStay);
  return stay.rooms.length > 0 || stay.beds.length > 0;
}
