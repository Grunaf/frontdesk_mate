import { Bed } from './Bed';
import { ROOM_LAYOUT_BEDS } from '../../model/room-layout';

interface RoomLayoutProps {
  highlightedBedId?: string;
  isNightMode?: boolean;
}

export function RoomLayout({ highlightedBedId, isNightMode = false }: RoomLayoutProps) {
  return (
    <svg
      viewBox="0 0 450 350" // Увеличили viewBox, так как изометрия требует больше места по высоте и ширине
      className={`h-auto w-full rounded-lg transition-colors duration-300 ${
        isNightMode ? 'bg-foreground/10' : 'bg-muted/40'
      }`}
    >
      {/* Главный контейнер трансформации:
        Сдвигаем в центр (translate) и применяем изометрическую матрицу.
        Матрица [0.866, 0.5, -0.866, 0.5, 0, 0] — это классический куб под 30°
      */}
      <g transform="translate(180, 40) matrix(0.866 0.5 -0.866 0.5 0 0)">
        {/* Стены комнаты (теперь это пол в изометрии) */}
        <rect
          x="10"
          y="10"
          width="260"
          height="220"
          rx="8"
          fill="none"
          className="stroke-border stroke-2"
        />

        {/* Обозначение двери */}
        <g transform="translate(110, 230)">
          <line x1="0" y1="0" x2="50" y2="0" className="stroke-primary stroke-4" />
          <text
            x="25"
            y="18"
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] font-semibold tracking-wider uppercase"
            /* Разворачиваем текст обратно, чтобы он оставался читаемым в 2D, либо убираем rotate */
            transform="scale(1, 1)"
          >
            Вход
          </text>
        </g>

        {/* Рендерим массив кроватей */}
        {ROOM_LAYOUT_BEDS.map((bed) => (
          <Bed
            key={bed.id}
            id={bed.id}
            x={bed.x}
            y={bed.y}
            isNightMode={isNightMode}
            // Измененная логика подсветки: подсвечиваем всю группу, если выбран один из ярусов
            isHighlighted={
              bed.id === highlightedBedId ||
              bed.topId === highlightedBedId ||
              bed.bottomId === highlightedBedId
            }
            isBunk={bed.isBunk}
            topId={bed.topId}
            bottomId={bed.bottomId}
            highlightedBedId={highlightedBedId} // Передаем id для точечной подсветки конкретного яруса
          />
        ))}
      </g>
    </svg>
  );
}
