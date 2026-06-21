import type { BedUnitType } from './bed-type';
import { isDoubleBed, resolveBedUnitType } from './bed-type';

export interface RoomLayoutBed {
  id: string;
  x: number;
  y: number;
  bedType?: BedUnitType;
  topId?: string;
  bottomId?: string;
  /** Degrees: 0 | 90 | 180 | 270 — rotation around bed center. */
  rotation?: number;
}

export interface RoomBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RoomEntranceSide = 'top' | 'bottom' | 'left' | 'right';

export const ROOM_ENTRANCE_SIDES: RoomEntranceSide[] = ['top', 'bottom', 'left', 'right'];

const ENTRANCE_MARKER_WIDTH = 50;
const ENTRANCE_WALL_OFFSET = 12;

export interface EntranceLayout {
  transform: string;
  line: { x1: number; y1: number; x2: number; y2: number };
  text: { x: number; y: number; rotate?: number };
  hitArea: { x: number; y: number; width: number; height: number };
}

export function normalizeEntranceSide(value?: string | null): RoomEntranceSide {
  if (value === 'top' || value === 'left' || value === 'right') {
    return value;
  }
  return 'bottom';
}

export function resolveEntranceSideFromPoint(
  point: { x: number; y: number },
  bounds: RoomBounds
): RoomEntranceSide {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;

  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy > 0 ? 'bottom' : 'top';
  }

  return dx > 0 ? 'right' : 'left';
}

export function resolveEntranceLayout(
  bounds: RoomBounds,
  side: RoomEntranceSide = 'bottom'
): EntranceLayout {
  const half = ENTRANCE_MARKER_WIDTH / 2;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;

  switch (side) {
    case 'top':
      return {
        transform: `translate(${cx - half}, ${bounds.y - ENTRANCE_WALL_OFFSET})`,
        line: { x1: 0, y1: 0, x2: ENTRANCE_MARKER_WIDTH, y2: 0 },
        text: { x: half, y: -6 },
        hitArea: { x: -4, y: -10, width: ENTRANCE_MARKER_WIDTH + 8, height: 16 },
      };
    case 'left':
      return {
        transform: `translate(${bounds.x - ENTRANCE_WALL_OFFSET}, ${cy - half})`,
        line: { x1: 0, y1: 0, x2: 0, y2: ENTRANCE_MARKER_WIDTH },
        text: { x: -8, y: half, rotate: -90 },
        hitArea: { x: -10, y: -4, width: 16, height: ENTRANCE_MARKER_WIDTH + 8 },
      };
    case 'right':
      return {
        transform: `translate(${bounds.x + bounds.width + ENTRANCE_WALL_OFFSET}, ${cy - half})`,
        line: { x1: 0, y1: 0, x2: 0, y2: ENTRANCE_MARKER_WIDTH },
        text: { x: 8, y: half, rotate: 90 },
        hitArea: { x: -6, y: -4, width: 16, height: ENTRANCE_MARKER_WIDTH + 8 },
      };
    case 'bottom':
    default:
      return {
        transform: `translate(${cx - half}, ${bounds.y + bounds.height + ENTRANCE_WALL_OFFSET})`,
        line: { x1: 0, y1: 0, x2: ENTRANCE_MARKER_WIDTH, y2: 0 },
        text: { x: half, y: 18 },
        hitArea: { x: -4, y: -6, width: ENTRANCE_MARKER_WIDTH + 8, height: 16 },
      };
  }
}

/** @deprecated Use resolveRoomBounds() — kept for tests and fallbacks */
export const ROOM_BOUNDS: RoomBounds = { x: 10, y: 10, width: 260, height: 220 };

export const DEFAULT_ROOM_BOUNDS = ROOM_BOUNDS;

export const ROOM_SIZE_LIMITS = {
  minWidth: 140,
  maxWidth: 320,
  minHeight: 120,
  maxHeight: 280,
} as const;

/** ViewBox with padding so isometric room floor is not clipped by card edges. */
export const ROOM_LAYOUT_VIEWBOX = { width: 500, height: 400 } as const;
export const ROOM_INNER_TRANSFORM = 'translate(195, 72) matrix(0.866 0.5 -0.866 0.5 0 0)';
export const BED_WIDTH = 70;
export const BED_HEIGHT = 45;
/** Each berth in a double (stacked along the pillow wall). */
export const DOUBLE_BERTH_HEIGHT = BED_HEIGHT;
export const DOUBLE_BERTH_PILLOW_HEIGHT = 30;
/** Two berths side by side in isometric — same layout width as single, slightly shorter stack. */
export const DOUBLE_BED_WIDTH = BED_WIDTH;
export const DOUBLE_BED_HEIGHT = DOUBLE_BERTH_HEIGHT * 2;
export const LAYOUT_GRID_STEP = 10;
export const BED_ROTATION_STEPS = [0, 90, 180, 270] as const;

export interface StayBedLayout {
  x: number;
  y: number;
  topId?: string;
  bottomId?: string;
  rotation?: number;
}

function snap(value: number, step = LAYOUT_GRID_STEP) {
  return Math.round(value / step) * step;
}

export function clampRoomSize(width: number, height: number): { width: number; height: number } {
  return {
    width: snap(Math.min(Math.max(width, ROOM_SIZE_LIMITS.minWidth), ROOM_SIZE_LIMITS.maxWidth)),
    height: snap(Math.min(Math.max(height, ROOM_SIZE_LIMITS.minHeight), ROOM_SIZE_LIMITS.maxHeight)),
  };
}

/** ViewBox center — room floor centroid is aligned here after isometric projection. */
export const ROOM_LAYOUT_VIEW_TARGET = {
  x: ROOM_LAYOUT_VIEWBOX.width / 2,
  y: ROOM_LAYOUT_VIEWBOX.height / 2,
} as const;

const ISO_MATRIX = { a: 0.866, b: 0.5, c: -0.866, d: 0.5, tx: 195, ty: 72 } as const;

function layoutPointToView(x: number, y: number): { x: number; y: number } {
  return {
    x: ISO_MATRIX.tx + ISO_MATRIX.a * x + ISO_MATRIX.c * y,
    y: ISO_MATRIX.ty + ISO_MATRIX.b * x + ISO_MATRIX.d * y,
  };
}

/** @deprecated Kept for reference — use getRoomCenteringOffset() which accounts for isometric skew. */
export const ROOM_LAYOUT_CENTER = { x: 140, y: 120 } as const;

export function getRoomCenteringOffset(bounds: RoomBounds): { x: number; y: number } {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const projected = layoutPointToView(cx, cy);

  const deltaScreenX = ROOM_LAYOUT_VIEW_TARGET.x - projected.x;
  const deltaScreenY = ROOM_LAYOUT_VIEW_TARGET.y - projected.y;

  // deltaScreenX = a * (dx - dy), deltaScreenY = b * dx + d * dy  (b = d = 0.5)
  const dxMinusDy = deltaScreenX / ISO_MATRIX.a;
  const dxPlusDy = 2 * deltaScreenY;
  const dx = (dxMinusDy + dxPlusDy) / 2;
  const dy = (dxPlusDy - dxMinusDy) / 2;

  return {
    x: dx,
    y: dy,
  };
}

export function resolveRoomBounds(room?: { mapWidth?: number; mapHeight?: number } | null): RoomBounds {
  const { width, height } = clampRoomSize(
    room?.mapWidth ?? DEFAULT_ROOM_BOUNDS.width,
    room?.mapHeight ?? DEFAULT_ROOM_BOUNDS.height
  );

  return {
    x: DEFAULT_ROOM_BOUNDS.x,
    y: DEFAULT_ROOM_BOUNDS.y,
    width,
    height,
  };
}

export function getEntranceTransform(
  bounds: RoomBounds,
  side: RoomEntranceSide = 'bottom'
): string {
  return resolveEntranceLayout(bounds, side).transform;
}

export function normalizeBedRotation(value?: number): number {
  const step = Math.round((value ?? 0) / 90) * 90;
  const normalized = ((step % 360) + 360) % 360;
  return BED_ROTATION_STEPS.includes(normalized as (typeof BED_ROTATION_STEPS)[number])
    ? normalized
    : 0;
}

/** Returns true when bed has SVG map coordinates configured. */
export function stayBedHasLayout<T extends { x?: number; y?: number }>(
  bed: T
): bed is T & { x: number; y: number } {
  return typeof bed.x === 'number' && typeof bed.y === 'number';
}

export function toRoomLayoutBed(bed: {
  id: string;
  x: number;
  y: number;
  bedType?: BedUnitType;
  topId?: string;
  bottomId?: string;
  rotation?: number;
}): RoomLayoutBed {
  const bedType = resolveBedUnitType(bed);

  return {
    id: bed.id,
    x: bed.x,
    y: bed.y,
    bedType,
    topId: bed.topId?.trim() || undefined,
    bottomId: bed.bottomId?.trim() || undefined,
    rotation: normalizeBedRotation(bed.rotation),
  };
}

export function getBedRenderWidth(bed: Pick<RoomLayoutBed, 'bedType'>): number {
  const type = resolveBedUnitType(bed);
  return isDoubleBed(type) ? DOUBLE_BED_WIDTH : BED_WIDTH;
}

export function getBedRenderHeight(bed: Pick<RoomLayoutBed, 'bedType'>): number {
  const type = resolveBedUnitType(bed);
  if (type === 'bunk') return BED_HEIGHT + 15;
  if (type === 'double') return DOUBLE_BED_HEIGHT;
  return BED_HEIGHT;
}

export function clampBedToRoom(
  bed: { x: number; y: number; bedType?: BedUnitType },
  bounds: RoomBounds
): { x: number; y: number } {
  const bedType = resolveBedUnitType(bed);
  const width = getBedRenderWidth({ bedType });
  const height = getBedRenderHeight({ bedType });
  const maxX = bounds.x + bounds.width - width;
  const maxY = bounds.y + bounds.height - height;

  const clamp = (value: number, min: number, max: number) => {
    const snapped = snap(value);
    return Math.min(Math.max(snapped, min), max);
  };

  return {
    x: clamp(bed.x, bounds.x, maxX),
    y: clamp(bed.y, bounds.y, maxY),
  };
}
