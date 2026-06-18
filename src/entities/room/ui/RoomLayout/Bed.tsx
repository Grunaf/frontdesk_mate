// src/entities/room/ui/RoomLayout/Bed.tsx

// 1. Добавлены новые пропсы для поддержки двухъярусности
interface BedProps {
  id: string;
  x: number;
  y: number;
  isHighlighted: boolean;
  isNightMode: boolean;
  isBunk?: boolean;
  topId?: string;
  bottomId?: string;
  highlightedBedId?: string;
}

export function Bed({
  id,
  x,
  y,
  isHighlighted,
  isNightMode,
  isBunk,
  topId,
  bottomId,
  highlightedBedId,
}: BedProps) {
  const isTopHighlighted = topId === highlightedBedId;
  const isBottomHighlighted = bottomId === highlightedBedId || (isHighlighted && !isBunk);

  // 2. Разделение цветов: нижний ярус теперь темнее, так как он в тени
  const getBottomColors = () => {
    if (isBottomHighlighted)
      return {
        bed: 'fill-primary stroke-primary',
        pillow: 'fill-primary/70',
        text: 'fill-primary-foreground font-bold',
      };
    return isNightMode
      ? {
          bed: 'fill-foreground/20 stroke-border',
          pillow: 'fill-foreground/30',
          text: 'fill-muted-foreground',
        }
      : {
          bed: 'fill-muted stroke-border',
          pillow: 'fill-muted-foreground/40',
          text: 'fill-muted-foreground',
        };
  };

  // Верхний ярус ярче и светлее (ближе к свету)
  const getTopColors = () => {
    if (isTopHighlighted)
      return {
        bed: 'fill-primary/80 stroke-primary',
        pillow: 'fill-primary/60',
        text: 'fill-primary-foreground font-bold',
      };
    return isNightMode
      ? {
          bed: 'fill-foreground/30 stroke-border',
          pillow: 'fill-foreground/40',
          text: 'fill-muted-foreground',
        }
      : { bed: 'fill-background stroke-border', pillow: 'fill-muted', text: 'fill-muted-foreground' };
  };

  const bottomColors = getBottomColors();
  const topColors = getTopColors();

  return (
    <g transform={`translate(${x}, ${y})`} className="transition-all duration-300">
      {/* НИЖНИЙ ЯРУС */}
      <g>
        <rect width="70" height="45" rx="4" className={`${bottomColors.bed} stroke-2`} />
        <rect x="5" y="5" width="12" height="35" rx="2" className={bottomColors.pillow} />
        <text
          x="40"
          y="26"
          textAnchor="middle"
          className={`text-[10px] select-none ${bottomColors.text}`}
          transform="rotate(-30) skewX(30) scale(1.1)"
        >
          {isBunk ? bottomId : id}
        </text>
      </g>

      {/* 3. ЭТОТ БЛОК ПОЛНОСТЬЮ НОВЫЙ (Рендерится только для двухъярусных кроватей) */}
      {isBunk && (
        <g>
          {/* Полупрозрачная тень на нижний матрас */}
          <rect
            width="70"
            height="45"
            rx="4"
            className="pointer-events-none fill-foreground/20 mix-blend-multiply"
            transform="translate(-4, -4)"
          />

          {/* 3D Стойки каркаса (ножки) */}
          <polygon
            points="0,45 -15,30 -15,12 0,27"
            className={isNightMode ? 'fill-muted-foreground' : 'fill-muted-foreground/70'}
          />
          <polygon
            points="70,45 55,30 55,12 70,27"
            className={isNightMode ? 'fill-muted-foreground' : 'fill-muted-foreground/70'}
          />

          {/* Мини-лестница на торце для разделения планов */}
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

          {/* ВТОРОЙ ЯРУС (Смещен по высоте) */}
          <g transform="translate(-15, -15)">
            {/* Визуальный бортик безопасности */}
            <rect
              width="70"
              height="45"
              rx="4"
              className="fill-foreground/10 stroke-none"
              transform="translate(0, 2)"
            />

            <rect width="70" height="45" rx="4" className={`${topColors.bed} stroke-2`} />
            <rect x="5" y="5" width="12" height="35" rx="2" className={topColors.pillow} />
            <text
              x="40"
              y="26"
              textAnchor="middle"
              className={`text-[10px] select-none ${topColors.text}`}
              transform="rotate(-30) skewX(30) scale(1.1)"
            >
              {topId}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}
