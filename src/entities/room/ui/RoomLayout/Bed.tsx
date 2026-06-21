import type { BedUnitType } from '../../model/bed-type';
import { resolveBedUnitType } from '../../model/bed-type';
import {
  BED_HEIGHT,
  BED_WIDTH,
  DOUBLE_BED_HEIGHT,
  DOUBLE_BED_WIDTH,
  DOUBLE_BERTH_HEIGHT,
  DOUBLE_BERTH_PILLOW_HEIGHT,
  getBedRenderHeight,
  getBedRenderWidth,
  normalizeBedRotation,
} from '../../model/room-layout';

const READABLE_LABEL = {
  fill: '#1e293b',
  stroke: '#ffffff',
  fillHighlighted: '#ffffff',
  strokeHighlighted: '#9a3412',
} as const;

const HIGHLIGHT_BED = {
  bed: 'fill-[#FF6B00] stroke-[#ea580c]',
  pillow: 'fill-[#ffedd5]',
} as const;

function BedLabel({
  readable,
  highlighted,
  x,
  y,
  label,
  guestFill,
  guestClass,
  counterRotation = 0,
}: {
  readable: boolean;
  highlighted: boolean;
  x: number;
  y: number;
  label: string | undefined;
  guestFill: string;
  guestClass: string;
  counterRotation?: number;
}) {
  if (!label) return null;

  const uprightTransform =
    readable && counterRotation !== 0 ? `rotate(${-counterRotation}, ${x}, ${y})` : undefined;

  if (readable) {
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={highlighted ? READABLE_LABEL.fillHighlighted : READABLE_LABEL.fill}
        stroke={highlighted ? READABLE_LABEL.strokeHighlighted : READABLE_LABEL.stroke}
        strokeWidth={highlighted ? 1.5 : 2.5}
        paintOrder="stroke fill"
        fontSize={10}
        fontWeight={600}
        transform={uprightTransform}
        className="select-none pointer-events-none"
      >
        {label}
      </text>
    );
  }

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={guestFill}
      className={`text-[10px] select-none ${guestClass}`}
      transform="rotate(-30) skewX(30) scale(1.1)"
    >
      {label}
    </text>
  );
}

interface BedProps {
  id: string;
  x: number;
  y: number;
  isHighlighted: boolean;
  isNightMode: boolean;
  /** Admin map editor — high-contrast labels on light bed fills. */
  editorMode?: boolean;
  /** Guest map — center labels with stroke (readable, not isometric). */
  readableLabels?: boolean;
  bedType?: BedUnitType;
  topId?: string;
  bottomId?: string;
  unitLabel?: string;
  bottomLabel?: string;
  topLabel?: string;
  highlightedBedId?: string;
  selected?: boolean;
  rotation?: number;
}

export function Bed({
  id,
  x,
  y,
  isHighlighted,
  isNightMode,
  editorMode = false,
  readableLabels = false,
  bedType: bedTypeProp,
  topId,
  bottomId,
  unitLabel,
  bottomLabel,
  topLabel,
  highlightedBedId,
  selected = false,
  rotation: rotationProp = 0,
}: BedProps) {
  const bedType = resolveBedUnitType({ bedType: bedTypeProp });
  const isBunk = bedType === 'bunk';
  const isDouble = bedType === 'double';
  const width = getBedRenderWidth({ bedType });
  const height = getBedRenderHeight({ bedType });
  const rotation = normalizeBedRotation(rotationProp);
  const labelReadable = editorMode || readableLabels;
  const labelX = width / 2 + 5;
  const labelCenterX = isDouble ? DOUBLE_BED_WIDTH / 2 : width / 2;
  const labelCenterY = isDouble ? DOUBLE_BED_HEIGHT / 2 : BED_HEIGHT / 2;
  const pivotX = width / 2;
  const pivotY = height / 2;
  const pillowHeight = isDouble ? DOUBLE_BERTH_PILLOW_HEIGHT : 35;

  const isTopHighlighted = topId === highlightedBedId;
  const isBottomHighlighted = bottomId === highlightedBedId || (isHighlighted && !isBunk);

  const getBottomColors = () => {
    if (isBottomHighlighted) {
      return {
        bed: HIGHLIGHT_BED.bed,
        pillow: HIGHLIGHT_BED.pillow,
        textFill: '#ffffff',
        textClass: 'font-bold',
      };
    }
    if (editorMode) {
      return {
        bed: 'fill-muted stroke-border',
        pillow: 'fill-muted-foreground/30',
        textFill: 'var(--foreground)',
        textClass: 'font-medium',
      };
    }
    return isNightMode
      ? {
          bed: 'fill-foreground/20 stroke-border',
          pillow: 'fill-foreground/30',
          textFill: 'var(--muted-foreground)',
          textClass: '',
        }
      : {
          bed: 'fill-muted stroke-border',
          pillow: 'fill-muted-foreground/40',
          textFill: 'var(--foreground)',
          textClass: '',
        };
  };

  const getTopColors = () => {
    if (isTopHighlighted) {
      return {
        bed: HIGHLIGHT_BED.bed,
        pillow: HIGHLIGHT_BED.pillow,
        textFill: '#ffffff',
        textClass: 'font-bold',
      };
    }
    if (editorMode) {
      return {
        bed: 'fill-muted stroke-border',
        pillow: 'fill-muted-foreground/30',
        textFill: 'var(--foreground)',
        textClass: 'font-medium',
      };
    }
    return isNightMode
      ? {
          bed: 'fill-foreground/30 stroke-border',
          pillow: 'fill-foreground/40',
          textFill: 'var(--muted-foreground)',
          textClass: '',
        }
      : {
          bed: 'fill-background stroke-border',
          pillow: 'fill-muted',
          textFill: 'var(--foreground)',
          textClass: '',
        };
  };

  const bottomColors = getBottomColors();
  const topColors = getTopColors();

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation}, ${pivotX}, ${pivotY})`}
      className="transition-all duration-300"
    >
      {selected && (
        <rect
          x="-4"
          y="-4"
          width={width + 8}
          height={height + 8}
          rx="6"
          className="fill-none stroke-primary stroke-2 stroke-dashed"
          pointerEvents="none"
        />
      )}

      <g>
        {isDouble ? (
          <>
            <rect width={DOUBLE_BED_WIDTH} height={DOUBLE_BERTH_HEIGHT} rx="4" className={`${bottomColors.bed} stroke-2`} />
            <rect
              y={DOUBLE_BERTH_HEIGHT}
              width={DOUBLE_BED_WIDTH}
              height={DOUBLE_BERTH_HEIGHT}
              rx="4"
              className={`${bottomColors.bed} stroke-2`}
            />
            <line
              x1="4"
              y1={DOUBLE_BERTH_HEIGHT}
              x2={DOUBLE_BED_WIDTH - 4}
              y2={DOUBLE_BERTH_HEIGHT}
              className="stroke-border/70"
              strokeWidth="1.5"
            />
            <rect x="5" y="5" width="12" height={pillowHeight} rx="2" className={bottomColors.pillow} />
            <rect
              x="5"
              y={DOUBLE_BERTH_HEIGHT + 5}
              width="12"
              height={pillowHeight}
              rx="2"
              className={bottomColors.pillow}
            />
          </>
        ) : (
          <>
            <rect width={width} height={BED_HEIGHT} rx="4" className={`${bottomColors.bed} stroke-2`} />
            <rect x="5" y="5" width="12" height={pillowHeight} rx="2" className={bottomColors.pillow} />
          </>
        )}
        <BedLabel
          readable={labelReadable}
          highlighted={isBottomHighlighted}
          x={labelReadable ? labelCenterX : labelX}
          y={labelReadable ? labelCenterY : 26}
          label={isBunk ? (bottomLabel ?? bottomId) : (unitLabel ?? id)}
          guestFill={bottomColors.textFill}
          guestClass={bottomColors.textClass}
          counterRotation={rotation}
        />
      </g>

      {isBunk && (
        <g>
          <rect
            width={BED_WIDTH}
            height={BED_HEIGHT}
            rx="4"
            className="pointer-events-none fill-foreground/20 mix-blend-multiply"
            transform="translate(-4, -4)"
          />

          <polygon
            points="0,45 -15,30 -15,12 0,27"
            className={isNightMode ? 'fill-muted-foreground' : 'fill-muted-foreground/70'}
          />
          <polygon
            points="70,45 55,30 55,12 70,27"
            className={isNightMode ? 'fill-muted-foreground' : 'fill-muted-foreground/70'}
          />

          <g
            transform="translate(25, 25) rotate(-30) skewX(30)"
            className={isNightMode ? 'stroke-muted-foreground' : 'stroke-muted-foreground/70'}
          >
            <line x1="0" y1="5" x2="0" y2="-20" strokeWidth="2" />
            <line x1="10" y1="5" x2="10" y2="-20" strokeWidth="2" />
            <line x1="0" y1="-2" x2="10" y2="-2" strokeWidth="1.5" />
            <line x1="0" y1="-9" x2="10" y2="-9" strokeWidth="1.5" />
            <line x1="0" y1="-16" x2="10" y2="-16" strokeWidth="1.5" />
          </g>

          <g transform="translate(-15, -15)">
            <rect
              width={BED_WIDTH}
              height={BED_HEIGHT}
              rx="4"
              className="fill-foreground/10 stroke-none"
              transform="translate(0, 2)"
            />

            <rect width={BED_WIDTH} height={BED_HEIGHT} rx="4" className={`${topColors.bed} stroke-2`} />
            <rect x="5" y="5" width="12" height="35" rx="2" className={topColors.pillow} />
            <BedLabel
              readable={labelReadable}
              highlighted={isTopHighlighted}
              x={labelReadable ? BED_WIDTH / 2 : 40}
              y={labelReadable ? BED_HEIGHT / 2 : 26}
              label={topLabel ?? topId}
              guestFill={topColors.textFill}
              guestClass={topColors.textClass}
              counterRotation={rotation}
            />
          </g>
        </g>
      )}
    </g>
  );
}
