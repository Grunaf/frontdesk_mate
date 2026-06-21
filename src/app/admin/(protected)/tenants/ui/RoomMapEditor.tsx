'use client';

import { useCallback, useRef, useState } from 'react';
import { Bed } from '@/entities/room/ui/RoomLayout/Bed';
import { RoomLayoutCanvas } from '@/entities/room/ui/RoomLayout/RoomLayoutCanvas';
import {
  applyBedUnitType,
  BED_UNIT_TYPES,
  resolveBedUnitType,
  type BedUnitType,
} from '@/entities/room/model/bed-type';
import {
  clampBedToRoom,
  clampRoomSize,
  getBedRenderHeight,
  getBedRenderWidth,
  normalizeBedRotation,
  normalizeEntranceSide,
  resolveEntranceSideFromPoint,
  resolveRoomBounds,
  stayBedHasLayout,
  toRoomLayoutBed,
  type RoomBounds,
  type RoomEntranceSide,
  ROOM_ENTRANCE_SIDES,
} from '@/entities/room/model/room-layout';
import type { GuestStayConfig, StayBed, StayRoom } from '@/entities/tenant';
import { resolveBedMapDisplayLabel } from '@/entities/tenant/lib/resolveBedDisplay';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, RotateCw, Trash2 } from 'lucide-react';

type DragMode =
  | { kind: 'bed'; index: number; offsetX: number; offsetY: number }
  | { kind: 'room'; bounds: RoomBounds }
  | { kind: 'entrance' };

const ENTRANCE_SIDE_LABELS: Record<RoomEntranceSide, string> = {
  top: 'Top',
  bottom: 'Bottom',
  left: 'Left',
  right: 'Right',
};

function clientToLayoutCoords(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const inner = svg.querySelector('[data-layout-inner]');
  if (!(inner instanceof SVGGElement)) return null;

  const matrix = inner.getScreenCTM()?.inverse();
  if (!matrix) return null;

  return point.matrixTransform(matrix);
}

function nextBedId(beds: StayBed[], roomId: string) {
  const prefix = `${roomId}_bed_`;
  let index = beds.filter((bed) => bed.roomId === roomId).length + 1;

  while (beds.some((bed) => bed.id === `${prefix}${index}`)) {
    index += 1;
  }

  return `${prefix}${index}`;
}

interface RoomMapEditorProps {
  room: StayRoom;
  onRoomChange: (patch: Partial<StayRoom>) => void;
  beds: StayBed[];
  onBedsChange: (beds: StayBed[]) => void;
  guestStay?: GuestStayConfig;
  previewBedId?: string;
  onPreviewBedSelect?: (bedId: string) => void;
}

export function RoomMapEditor({
  room,
  onRoomChange,
  beds,
  onBedsChange,
  guestStay,
  previewBedId,
  onPreviewBedSelect,
}: RoomMapEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragMode | null>(null);

  const [placementType, setPlacementType] = useState<BedUnitType>('single');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const roomBounds = resolveRoomBounds(room);
  const entranceSide = normalizeEntranceSide(room.entranceSide);
  const roomBedIndices = beds
    .map((bed, index) => ({ bed, index }))
    .filter(({ bed }) => bed.roomId === room.id && stayBedHasLayout(bed));

  const selectedBed = selectedIndex !== null ? beds[selectedIndex] : null;

  const updateBed = useCallback(
    (index: number, patch: Partial<StayBed>) => {
      onBedsChange(beds.map((bed, i) => (i === index ? { ...bed, ...patch } : bed)));
    },
    [beds, onBedsChange]
  );

  const applyRoomSize = useCallback(
    (width: number, height: number) => {
      const clamped = clampRoomSize(width, height);
      onRoomChange({ mapWidth: clamped.width, mapHeight: clamped.height });

      const nextBounds = resolveRoomBounds({ mapWidth: clamped.width, mapHeight: clamped.height });
      onBedsChange(
        beds.map((bed) => {
          if (bed.roomId !== room.id || !stayBedHasLayout(bed)) return bed;
          return { ...bed, ...clampBedToRoom(bed, nextBounds) };
        })
      );
    },
    [beds, onBedsChange, onRoomChange, room.id]
  );

  const removeBed = (index: number) => {
    onBedsChange(beds.filter((_, i) => i !== index));
    setSelectedIndex(null);
  };

  const rotateBed = (index: number) => {
    const bed = beds[index];
    if (!bed) return;
    updateBed(index, { rotation: normalizeBedRotation((bed.rotation ?? 0) + 90) });
  };

  const addBedAt = (rawX: number, rawY: number) => {
    const bedType = placementType;
    const next = clampBedToRoom({ x: rawX, y: rawY, bedType }, roomBounds);
    const id = nextBedId(beds, room.id);
    const typeFields = applyBedUnitType({ id }, bedType);

    onBedsChange([
      ...beds,
      { id, roomId: room.id, x: next.x, y: next.y, rotation: 0, ...typeFields },
    ]);
    setSelectedIndex(beds.length);
  };

  const handleCanvasClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current) return;
    if ((event.target as Element).closest('[data-bed-interactive], [data-room-resize], [data-entrance-interactive]')) return;

    const svg = svgRef.current;
    if (!svg) return;

    const coords = clientToLayoutCoords(svg, event.clientX, event.clientY);
    if (!coords) return;

    const inside =
      coords.x >= roomBounds.x &&
      coords.y >= roomBounds.y &&
      coords.x <= roomBounds.x + roomBounds.width &&
      coords.y <= roomBounds.y + roomBounds.height;

    if (!inside) {
      setSelectedIndex(null);
      return;
    }

    addBedAt(coords.x, coords.y);
  };

  const handleBedPointerDown = (index: number, event: React.PointerEvent) => {
    event.stopPropagation();
    setSelectedIndex(index);

    const svg = svgRef.current;
    const bed = beds[index];
    if (!svg || !bed || !stayBedHasLayout(bed)) return;

    const coords = clientToLayoutCoords(svg, event.clientX, event.clientY);
    if (!coords) return;

    dragRef.current = { kind: 'bed', index, offsetX: coords.x - bed.x, offsetY: coords.y - bed.y };
    (event.target as Element).setPointerCapture(event.pointerId);
  };

  const handleEntrancePointerDown = (event: React.PointerEvent<SVGGElement>) => {
    event.stopPropagation();
    setSelectedIndex(null);
    dragRef.current = { kind: 'entrance' };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  };

  const handleRoomResizeStart = (event: React.PointerEvent<SVGCircleElement>) => {
    event.stopPropagation();
    setSelectedIndex(null);
    dragRef.current = { kind: 'room', bounds: roomBounds };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || !svg) return;

    const coords = clientToLayoutCoords(svg, event.clientX, event.clientY);
    if (!coords) return;

    if (drag.kind === 'room') {
      applyRoomSize(coords.x - drag.bounds.x, coords.y - drag.bounds.y);
      return;
    }

    if (drag.kind === 'entrance') {
      onRoomChange({ entranceSide: resolveEntranceSideFromPoint(coords, roomBounds) });
      return;
    }

    const bed = beds[drag.index];
    if (!bed) return;

    const bedType = resolveBedUnitType(bed);
    const next = clampBedToRoom(
      { x: coords.x - drag.offsetX, y: coords.y - drag.offsetY, bedType },
      roomBounds
    );
    updateBed(drag.index, next);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    const svg = svgRef.current;

    if (drag?.kind === 'entrance' && svg) {
      const coords = clientToLayoutCoords(svg, event.clientX, event.clientY);
      if (coords) {
        onRoomChange({ entranceSide: resolveEntranceSideFromPoint(coords, roomBounds) });
      }
    }

    if (dragRef.current) {
      dragRef.current = null;
      (event.target as Element).releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/25 bg-muted/5">
      <button
        type="button"
        onClick={() => setEditorOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div>
          <p className="text-xs font-medium">Bed map</p>
          <p className="text-[11px] text-muted-foreground">
            {editorOpen
              ? `${roomBounds.width}×${roomBounds.height} — drag corner to resize room`
              : roomBedIndices.length > 0
                ? `${roomBedIndices.length} bed(s) — open to edit`
                : 'Open to place beds'}
          </p>
        </div>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', editorOpen && 'rotate-180')}
        />
      </button>

      {editorOpen && (
        <div className="space-y-3 border-t border-dashed px-3 pb-3 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {BED_UNIT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPlacementType(option.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-left text-[11px] transition-colors',
                  placementType === option.value
                    ? 'border-primary bg-primary/10'
                    : 'bg-background hover:bg-muted/50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Entrance wall</span>
            {ROOM_ENTRANCE_SIDES.map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => onRoomChange({ entranceSide: side })}
                className={cn(
                  'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                  entranceSide === side
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'bg-background hover:bg-muted/50'
                )}
              >
                {ENTRANCE_SIDE_LABELS[side]}
              </button>
            ))}
          </div>

          <RoomLayoutCanvas
            svgRef={svgRef}
            roomBounds={roomBounds}
            entranceLabel="Entrance"
            entranceSide={entranceSide}
            interactive
            allowRoomResize
            allowEntranceMove
            onEntrancePointerDown={handleEntrancePointerDown}
            onCanvasClick={handleCanvasClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onRoomResizeStart={handleRoomResizeStart}
          >
            {roomBedIndices.map(({ bed, index }) => {
              if (!stayBedHasLayout(bed)) return null;

              const layoutBed = toRoomLayoutBed(bed);
              const width = getBedRenderWidth(layoutBed);
              const height = getBedRenderHeight(layoutBed);
              const bedType = resolveBedUnitType(bed);
              const bottomLabel = resolveBedMapDisplayLabel(guestStay, bed, 'bottom');
              const topLabel =
                bedType === 'bunk' ? resolveBedMapDisplayLabel(guestStay, bed, 'top') : undefined;
              const unitLabel =
                bedType === 'bunk' ? undefined : resolveBedMapDisplayLabel(guestStay, bed);

              return (
                <g
                  key={`${bed.id}-${index}`}
                  data-bed-interactive=""
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(event) => handleBedPointerDown(index, event)}
                >
                  <rect x={bed.x} y={bed.y} width={width} height={height} fill="transparent" />
                  <Bed
                    id={bed.id}
                    x={bed.x}
                    y={bed.y}
                    rotation={layoutBed.rotation}
                    isNightMode={false}
                    editorMode
                    bedType={layoutBed.bedType}
                    isHighlighted={
                      bed.id === previewBedId ||
                      bed.topId === previewBedId ||
                      bed.bottomId === previewBedId
                    }
                    topId={bed.topId}
                    bottomId={bed.bottomId}
                    bottomLabel={bottomLabel}
                    topLabel={topLabel}
                    unitLabel={unitLabel}
                    highlightedBedId={previewBedId}
                    selected={selectedIndex === index}
                  />
                </g>
              );
            })}
          </RoomLayoutCanvas>

          {selectedBed && selectedIndex !== null && (
            <div className="space-y-3 rounded-lg border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium">
                  Bed {resolveBedMapDisplayLabel(guestStay, selectedBed)}
                  {resolveBedUnitType(selectedBed) === 'bunk' ? ' (bunk)' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => rotateBed(selectedIndex)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-muted"
                  >
                    <RotateCw className="size-3" />
                    Rotate
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBed(selectedIndex)}
                    className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"
                  >
                    <Trash2 className="size-3" />
                    Remove
                  </button>
                </div>
              </div>

              <select
                value={resolveBedUnitType(selectedBed)}
                onChange={(event) => {
                  const type = event.target.value as BedUnitType;
                  updateBed(selectedIndex, applyBedUnitType(selectedBed, type));
                }}
                className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
              >
                {BED_UNIT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {onPreviewBedSelect ? (
                resolveBedUnitType(selectedBed) === 'bunk' ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedBed.topId ? (
                      <button
                        type="button"
                        onClick={() => onPreviewBedSelect(selectedBed.topId!)}
                        className={cn(
                          'rounded-md border px-2.5 py-1.5 text-[11px] font-medium',
                          previewBedId === selectedBed.topId && 'border-primary bg-primary/10'
                        )}
                      >
                        Set upper as preview
                      </button>
                    ) : null}
                    {selectedBed.bottomId ? (
                      <button
                        type="button"
                        onClick={() => onPreviewBedSelect(selectedBed.bottomId!)}
                        className={cn(
                          'rounded-md border px-2.5 py-1.5 text-[11px] font-medium',
                          previewBedId === selectedBed.bottomId && 'border-primary bg-primary/10'
                        )}
                      >
                        Set lower as preview
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPreviewBedSelect(selectedBed.id)}
                    className={cn(
                      'w-full rounded-md border px-2.5 py-1.5 text-[11px] font-medium',
                      previewBedId === selectedBed.id && 'border-primary bg-primary/10'
                    )}
                  >
                    Set as preview bed
                  </button>
                )
              ) : null}
            </div>
          )}

          {roomBedIndices.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Click the floor to add a bed. Drag the entrance marker or pick a wall above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
