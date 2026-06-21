import { describe, expect, it } from 'vitest';
import { clampBedToRoom, clampRoomSize, getBedRenderHeight, getBedRenderWidth, getRoomCenteringOffset, normalizeBedRotation, resolveEntranceLayout, resolveEntranceSideFromPoint, resolveRoomBounds, ROOM_LAYOUT_VIEW_TARGET } from './room-layout';

describe('normalizeBedRotation', () => {
  it('snaps to 90° steps', () => {
    expect(normalizeBedRotation(95)).toBe(90);
    expect(normalizeBedRotation(270)).toBe(270);
  });

  it('wraps negative values', () => {
    expect(normalizeBedRotation(-90)).toBe(270);
  });
});

describe('clampRoomSize', () => {
  it('snaps and clamps room dimensions', () => {
    expect(clampRoomSize(155, 95)).toEqual({ width: 160, height: 120 });
    expect(clampRoomSize(400, 300)).toEqual({ width: 320, height: 280 });
  });
});

describe('resolveRoomBounds', () => {
  it('uses defaults when room has no size', () => {
    expect(resolveRoomBounds(null)).toEqual({ x: 10, y: 10, width: 260, height: 220 });
  });

  it('applies stored map size', () => {
    expect(resolveRoomBounds({ mapWidth: 200, mapHeight: 180 })).toEqual({
      x: 10,
      y: 10,
      width: 200,
      height: 180,
    });
  });
});

describe('getRoomCenteringOffset', () => {
  it('aligns default room centroid to the viewBox center in screen space', () => {
    const bounds = resolveRoomBounds(null);
    const offset = getRoomCenteringOffset(bounds);
    const cx = bounds.x + bounds.width / 2 + offset.x;
    const cy = bounds.y + bounds.height / 2 + offset.y;

    // Replicate isometric projection (same constants as room-layout.ts).
    const projectedX = 195 + 0.866 * cx - 0.866 * cy;
    const projectedY = 72 + 0.5 * cx + 0.5 * cy;

    expect(projectedX).toBeCloseTo(ROOM_LAYOUT_VIEW_TARGET.x, 0);
    expect(projectedY).toBeCloseTo(ROOM_LAYOUT_VIEW_TARGET.y, 0);
  });

  it('keeps smaller rooms centered after resize', () => {
    const bounds = resolveRoomBounds({ mapWidth: 140, mapHeight: 120 });
    const offset = getRoomCenteringOffset(bounds);
    const cx = bounds.x + bounds.width / 2 + offset.x;
    const cy = bounds.y + bounds.height / 2 + offset.y;

    const projectedX = 195 + 0.866 * cx - 0.866 * cy;
    const projectedY = 72 + 0.5 * cx + 0.5 * cy;

    expect(projectedX).toBeCloseTo(ROOM_LAYOUT_VIEW_TARGET.x, 0);
    expect(projectedY).toBeCloseTo(ROOM_LAYOUT_VIEW_TARGET.y, 0);
  });
});

describe('resolveEntranceSideFromPoint', () => {
  it('snaps pointer position to the nearest room wall', () => {
    const bounds = resolveRoomBounds({ mapWidth: 200, mapHeight: 180 });

    expect(resolveEntranceSideFromPoint({ x: bounds.x + bounds.width / 2, y: bounds.y - 5 }, bounds)).toBe(
      'top'
    );
    expect(
      resolveEntranceSideFromPoint(
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + 5 },
        bounds
      )
    ).toBe('bottom');
    expect(resolveEntranceSideFromPoint({ x: bounds.x - 5, y: bounds.y + bounds.height / 2 }, bounds)).toBe(
      'left'
    );
    expect(
      resolveEntranceSideFromPoint(
        { x: bounds.x + bounds.width + 5, y: bounds.y + bounds.height / 2 },
        bounds
      )
    ).toBe('right');
  });
});

describe('resolveEntranceLayout', () => {
  it('places entrance on the selected wall', () => {
    const bounds = resolveRoomBounds(null);
    const bottom = resolveEntranceLayout(bounds, 'bottom');
    const top = resolveEntranceLayout(bounds, 'top');
    const left = resolveEntranceLayout(bounds, 'left');
    const right = resolveEntranceLayout(bounds, 'right');

    expect(bottom.transform).toContain(String(bounds.y + bounds.height + 12));
    expect(top.transform).toContain(String(bounds.y - 12));
    expect(bottom.line).toEqual({ x1: 0, y1: 0, x2: 50, y2: 0 });
    expect(left.line).toEqual({ x1: 0, y1: 0, x2: 0, y2: 50 });
    expect(right.line).toEqual({ x1: 0, y1: 0, x2: 0, y2: 50 });
  });
});

describe('getBedRenderWidth', () => {
  it('uses compact side-by-side footprint for double beds', () => {
    expect(getBedRenderWidth({ bedType: 'double' })).toBe(70);
    expect(getBedRenderHeight({ bedType: 'double' })).toBe(90);
  });
});

describe('clampBedToRoom', () => {
  it('keeps bed inside room bounds', () => {
    const bounds = resolveRoomBounds({ mapWidth: 140, mapHeight: 120 });
    const next = clampBedToRoom({ x: 500, y: 500, bedType: 'single' }, bounds);
    expect(next.x).toBeLessThanOrEqual(bounds.x + bounds.width - 70);
    expect(next.y).toBeLessThanOrEqual(bounds.y + bounds.height - 45);
  });
});
