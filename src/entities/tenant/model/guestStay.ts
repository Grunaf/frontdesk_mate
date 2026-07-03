import type { BedUnitType } from '@/entities/room/model/bed-type';
import type { RoomEntranceSide, RoomLayoutBed, RoomBounds } from '@/entities/room/model/room-layout';

export interface StayFloor {
  id: string;
  label?: string;
  /** Shown after guest enters this floor — how to reach dorm area. */
  pathHint?: string;
  pathImage?: string;
}

export interface StayRoom {
  id: string;
  label: string;
  floorId: string;
  doorImage?: string;
  /** Room map floor width / height (snapped, clamped). Defaults: 260×220. */
  mapWidth?: number;
  mapHeight?: number;
  /** Which wall the entrance marker sits on. Defaults to bottom. */
  entranceSide?: RoomEntranceSide;
}

export interface StayBed {
  id: string;
  roomId: string;
  /** SVG map position (optional). */
  x?: number;
  y?: number;
  bedType?: BedUnitType;
  /** Guest-facing IDs for bunk tiers. */
  topId?: string;
  bottomId?: string;
  /** 0 | 90 | 180 | 270 — rotation around bed center on room map. */
  rotation?: number;
}

export interface GuestStayConfig {
  floors?: StayFloor[];
  rooms?: StayRoom[];
  beds?: StayBed[];
  /** When true, guest app requires Montenegro tourism registration before settlement. */
  tourismRegistrationRequired?: boolean;
}

export type GuestStayStepKind = 'floor_path' | 'room_door';

export interface GuestStayStep {
  id: string;
  kind: GuestStayStepKind;
  label: string;
  imageSrc?: string;
  hint?: string;
}

export interface GuestStayPlan {
  bedId: string | null;
  bedLabel: string | null;
  /** 1-based bed number within the room (for guest-facing copy). */
  bedSlot: number | null;
  bedTier?: 'upper' | 'lower';
  room: {
    id: string;
    label: string;
    doorImage?: string;
    entranceSide?: RoomEntranceSide;
  } | null;
  floor: {
    id: string;
    label: string;
    pathHint?: string;
    pathImage?: string;
  } | null;
  layoutBeds: RoomLayoutBed[];
  roomBounds: RoomBounds | null;
  steps: GuestStayStep[];
  hasContent: boolean;
}
