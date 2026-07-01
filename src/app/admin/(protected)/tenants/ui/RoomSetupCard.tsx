'use client';

import { useState } from 'react';
import type { GuestStayConfig, StayBed, StayFloor, StayRoom } from '@/entities/tenant';
import { stayBedHasLayout } from '@/entities/room/model/room-layout';
import { cn } from '@/shared/lib/utils';
import { ChevronDown, Trash2 } from 'lucide-react';
import { RoomMapEditor } from './RoomMapEditor';
import { AdminImageField } from './AdminImageField';

interface RoomSetupCardProps {
  room: StayRoom;
  tenantSlug: string;
  floors: StayFloor[];
  beds: StayBed[];
  guestStay?: GuestStayConfig;
  onRoomChange: (next: StayRoom) => void;
  onBedsChange: (beds: StayBed[]) => void;
  onRemove: () => void;
  previewBedId?: string;
  onPreviewBedSelect?: (bedId: string) => void;
}

export function RoomSetupCard({
  room,
  tenantSlug,
  floors,
  beds,
  guestStay,
  onRoomChange,
  onBedsChange,
  onRemove,
  previewBedId,
  onPreviewBedSelect,
}: RoomSetupCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const floorLabel = floors.find((floor) => floor.id === room.floorId)?.label ?? room.floorId;
  const bedCount = beds.filter((bed) => bed.roomId === room.id && stayBedHasLayout(bed)).length;

  return (
    <article className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{room.label || 'Unnamed room'}</p>
          <p className="text-xs text-muted-foreground">
            Floor {floorLabel} · {bedCount} bed{bedCount === 1 ? '' : 's'} on map
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Remove
        </button>
      </header>

      <div className="space-y-0 divide-y">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium hover:bg-muted/30"
        >
          Room details
          <ChevronDown className={cn('size-4 transition-transform', detailsOpen && 'rotate-180')} />
        </button>

        {detailsOpen && (
          <div className="grid gap-3 px-4 pb-4 pt-1 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Guest label</span>
              <input
                value={room.label}
                onChange={(event) => onRoomChange({ ...room, label: event.target.value })}
                placeholder="Vega"
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
              />
              <span className="text-[10px] text-muted-foreground">
                Guest app shows &quot;Room {'{label}'}&quot; (localized).
              </span>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">Floor</span>
              <select
                value={room.floorId}
                onChange={(event) => onRoomChange({ ...room, floorId: event.target.value })}
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
              >
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    Floor {floor.label || floor.id}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <AdminImageField
                label="Door photo"
                tenantSlug={tenantSlug}
                kind="misc"
                value={room.doorImage ?? ''}
                onChange={(next) => onRoomChange({ ...room, doorImage: next })}
                placeholder="/images/your-hostel/door.jpg"
                previewAlt={room.label ? `Room ${room.label} door` : 'Room door'}
              />
            </div>
          </div>
        )}

        <div className="px-4 py-3">
          <RoomMapEditor
            room={room}
            onRoomChange={(patch) => onRoomChange({ ...room, ...patch })}
            beds={beds}
            onBedsChange={onBedsChange}
            guestStay={guestStay}
            previewBedId={previewBedId}
            onPreviewBedSelect={onPreviewBedSelect}
          />
        </div>
      </div>
    </article>
  );
}
