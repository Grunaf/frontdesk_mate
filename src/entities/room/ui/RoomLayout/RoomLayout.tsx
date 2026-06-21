'use client';

import { Bed } from './Bed';
import { RoomLayoutCanvas } from './RoomLayoutCanvas';
import type { RoomLayoutBed, RoomBounds, RoomEntranceSide } from '../../model/room-layout';
import { resolveRoomBounds } from '../../model/room-layout';
import { resolveBedUnitType } from '../../model/bed-type';
import type { GuestStayConfig } from '@/entities/tenant';
import { resolveBedMapDisplayLabel } from '@/entities/tenant/lib/resolveBedDisplay';
import { useTranslations } from '@/shared/i18n';

interface RoomLayoutProps {
  beds: RoomLayoutBed[];
  roomBounds?: RoomBounds | null;
  guestStay?: GuestStayConfig;
  highlightedBedId?: string;
  entranceSide?: RoomEntranceSide;
  isNightMode?: boolean;
}

export function RoomLayout({
  beds,
  roomBounds,
  guestStay,
  highlightedBedId,
  entranceSide,
  isNightMode = false,
}: RoomLayoutProps) {
  const t = useTranslations('components.roomSchema');
  const bounds = roomBounds ?? resolveRoomBounds(null);

  if (beds.length === 0) return null;

  return (
    <RoomLayoutCanvas
      roomBounds={bounds}
      entranceLabel={t('entrance')}
      entranceSide={entranceSide}
      tone="guest"
    >
      {beds.map((bed, index) => {
        const stayBed = guestStay?.beds?.find((entry) => entry.id === bed.id);
        const bedType = stayBed ? resolveBedUnitType(stayBed) : resolveBedUnitType(bed);
        const bottomLabel = stayBed
          ? resolveBedMapDisplayLabel(guestStay, stayBed, 'bottom')
          : undefined;
        const topLabel =
          stayBed && bedType === 'bunk'
            ? resolveBedMapDisplayLabel(guestStay, stayBed, 'top')
            : undefined;
        const unitLabel =
          stayBed && bedType !== 'bunk'
            ? resolveBedMapDisplayLabel(guestStay, stayBed)
            : undefined;

        return (
        <Bed
          key={`${bed.id}-${index}`}
          id={bed.id}
          x={bed.x}
          y={bed.y}
          rotation={bed.rotation}
          isNightMode={isNightMode}
          bedType={bed.bedType}
          isHighlighted={
            bed.id === highlightedBedId ||
            bed.topId === highlightedBedId ||
            bed.bottomId === highlightedBedId
          }
          topId={bed.topId}
          bottomId={bed.bottomId}
          bottomLabel={bottomLabel}
          topLabel={topLabel}
          unitLabel={unitLabel}
          highlightedBedId={highlightedBedId}
          readableLabels
        />
        );
      })}
    </RoomLayoutCanvas>
  );
}
