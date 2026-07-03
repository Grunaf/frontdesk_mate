'use client';

import type { ReactNode, PointerEvent, MouseEvent } from 'react';
import {
  getRoomCenteringOffset,
  normalizeEntranceSide,
  resolveEntranceLayout,
  type RoomBounds,
  type RoomEntranceSide,
  ROOM_LAYOUT_VIEWBOX,
  ROOM_INNER_TRANSFORM,
} from '../../model/room-layout';
import { cn } from '@/shared/lib/utils';

interface RoomLayoutCanvasProps {
  children: ReactNode;
  roomBounds: RoomBounds;
  entranceLabel: string;
  entranceSide?: RoomEntranceSide;
  tone?: 'editor' | 'guest';
  className?: string;
  interactive?: boolean;
  allowRoomResize?: boolean;
  allowEntranceMove?: boolean;
  onEntranceSideChange?: (side: RoomEntranceSide) => void;
  onCanvasClick?: (event: MouseEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGSVGElement>) => void;
  onRoomResizeStart?: (event: PointerEvent<SVGCircleElement>) => void;
  onEntrancePointerDown?: (event: PointerEvent<SVGGElement>) => void;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export function RoomLayoutCanvas({
  children,
  roomBounds,
  entranceLabel,
  entranceSide,
  tone = 'editor',
  className,
  interactive = false,
  allowRoomResize = false,
  allowEntranceMove = false,
  onEntranceSideChange,
  onCanvasClick,
  onPointerMove,
  onPointerUp,
  onRoomResizeStart,
  onEntrancePointerDown,
  svgRef,
}: RoomLayoutCanvasProps) {
  const handleX = roomBounds.x + roomBounds.width;
  const handleY = roomBounds.y + roomBounds.height;
  const centerOffset = getRoomCenteringOffset(roomBounds);
  const isGuest = tone === 'guest';
  const floorGradientId = isGuest ? 'room-floor-gradient-guest' : 'room-floor-gradient';
  const entrance = resolveEntranceLayout(roomBounds, normalizeEntranceSide(entranceSide));
  const canMoveEntrance = allowEntranceMove && Boolean(onEntranceSideChange || onEntrancePointerDown);

  return (
    <div
      className={cn(
        isGuest
          ? 'w-full overflow-visible rounded-xl border border-border/60 bg-muted/10 p-2'
          : 'overflow-visible rounded-xl border p-3 shadow-sm border-primary/20 bg-gradient-to-br from-primary/8 via-background to-primary/5',
        className
      )}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${ROOM_LAYOUT_VIEWBOX.width} ${ROOM_LAYOUT_VIEWBOX.height}`}
        className={cn(
          'block h-auto w-full overflow-visible touch-none',
          interactive ? 'cursor-crosshair' : ''
        )}
        onClick={onCanvasClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          <linearGradient id="room-floor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="room-floor-gradient-guest" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--color-muted-foreground)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {!isGuest ? (
          <rect
            x="8"
            y="8"
            width={ROOM_LAYOUT_VIEWBOX.width - 16}
            height={ROOM_LAYOUT_VIEWBOX.height - 16}
            rx="14"
            className="fill-background/60 stroke-border/50"
          />
        ) : null}

        <g transform={ROOM_INNER_TRANSFORM}>
          <g
            transform={`translate(${centerOffset.x}, ${centerOffset.y})`}
            data-layout-inner=""
          >
          <rect
            x={roomBounds.x}
            y={roomBounds.y}
            width={roomBounds.width}
            height={roomBounds.height}
            rx="10"
            fill={`url(#${floorGradientId})`}
            className={cn(
              'stroke-[2.5]',
              isGuest ? 'stroke-border/60' : 'stroke-primary/35'
            )}
          />

          <g
            transform={entrance.transform}
            data-entrance-interactive=""
            className={canMoveEntrance ? 'cursor-grab active:cursor-grabbing' : undefined}
            onPointerDown={canMoveEntrance ? onEntrancePointerDown : undefined}
          >
            {canMoveEntrance ? (
              <rect
                x={entrance.hitArea.x}
                y={entrance.hitArea.y}
                width={entrance.hitArea.width}
                height={entrance.hitArea.height}
                fill="transparent"
              />
            ) : null}
            <line
              x1={entrance.line.x1}
              y1={entrance.line.y1}
              x2={entrance.line.x2}
              y2={entrance.line.y2}
              className={cn('stroke-[4]', isGuest ? 'stroke-muted-foreground' : 'stroke-primary')}
              strokeLinecap="round"
            />
            <text
              x={entrance.text.x}
              y={entrance.text.y}
              textAnchor="middle"
              transform={
                entrance.text.rotate
                  ? `rotate(${entrance.text.rotate} ${entrance.text.x} ${entrance.text.y})`
                  : undefined
              }
              className={cn(
                'text-xs font-semibold tracking-wider uppercase',
                isGuest ? 'fill-muted-foreground' : 'fill-primary/80',
                canMoveEntrance && 'pointer-events-none'
              )}
            >
              {entranceLabel}
            </text>
          </g>

          {children}

          {allowRoomResize && (
            <g data-room-resize="">
              <circle
                cx={handleX}
                cy={handleY}
                r="9"
                className="fill-primary stroke-background stroke-2 cursor-nwse-resize"
                onPointerDown={onRoomResizeStart}
              />
              <title>Drag to resize room</title>
            </g>
          )}
          </g>
        </g>
      </svg>
    </div>
  );
}
