'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GuestStayConfig, StayBed, StayFloor, StayRoom } from '@/entities/tenant';
import { stayBedHasLayout } from '@/entities/room/model/room-layout';
import { cn } from '@/shared/lib/utils';
import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';
import { ChevronDown, ChevronUp, Map, Trash2, X } from 'lucide-react';
import { RoomMapEditor } from './RoomMapEditor';
import { AdminImageField } from './AdminImageField';

const BED_MAP_MOBILE_MQ = '(max-width: 639px)';

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(BED_MAP_MOBILE_MQ);
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isMobile;
}

interface RoomSetupCardProps {
  room: StayRoom;
  tenantSlug: string;
  floors: StayFloor[];
  beds: StayBed[];
  guestStay?: GuestStayConfig;
  stayOffers?: Array<{ id: string; title: string }>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRoomChange: (next: StayRoom) => void;
  onBedsChange: (beds: StayBed[]) => void;
  onRemove: () => void;
}

export function RoomSetupCard({
  room,
  tenantSlug,
  floors,
  beds,
  guestStay,
  stayOffers = [],
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRoomChange,
  onBedsChange,
  onRemove,
}: RoomSetupCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [bedMapOpen, setBedMapOpen] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const isMobile = useIsMobileViewport();
  const dialogTitleId = useId();

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!bedMapOpen || isMobile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setBedMapOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bedMapOpen, isMobile]);

  const floorLabel = floors.find((floor) => floor.id === room.floorId)?.label ?? room.floorId;
  const bedCount = beds.filter((bed) => bed.roomId === room.id && stayBedHasLayout(bed)).length;
  const roomTitle = room.label || 'Unnamed room';

  const bedMapEditor = (
    <RoomMapEditor
      room={room}
      onRoomChange={(patch) => onRoomChange({ ...room, ...patch })}
      beds={beds}
      onBedsChange={onBedsChange}
      guestStay={guestStay}
    />
  );

  return (
    <article className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{roomTitle}</p>
          <p className="text-xs text-muted-foreground">
            Floor {floorLabel} · {bedCount} bed{bedCount === 1 ? '' : 's'} on map
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="rounded border p-1 disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="rounded border p-1 disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 px-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        </div>
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
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-[11px] font-medium text-muted-foreground">Stay offer</span>
              <select
                value={room.offerId ?? ''}
                onChange={(event) =>
                  onRoomChange({
                    ...room,
                    offerId: event.target.value.trim() || undefined,
                  })
                }
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm"
              >
                <option value="">None (advanced bed pick only)</option>
                {stayOffers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.title || offer.id}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-muted-foreground">
                Rooms linked to an offer form the auto-assign pool in reception.
              </span>
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

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {bedCount} bed{bedCount === 1 ? '' : 's'} on map
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setBedMapOpen(true)}>
            <Map className="size-3.5" />
            Edit bed map
          </Button>
        </div>
      </div>

      {isMobile ? (
        <BottomSheet open={bedMapOpen} onOpenChange={setBedMapOpen}>
          <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col overflow-hidden px-0 pb-0">
            <BottomSheetHeader className="px-6 pb-3 pr-14">
              <BottomSheetTitle>{roomTitle}</BottomSheetTitle>
            </BottomSheetHeader>
            <BottomSheetBody className="overflow-hidden px-6 pb-6" showScrollFade={false}>
              {bedMapEditor}
            </BottomSheetBody>
          </BottomSheetContent>
        </BottomSheet>
      ) : portalMounted && bedMapOpen ? (
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={() => setBedMapOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={dialogTitleId}
              className="relative flex max-h-[min(90dvh,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4 pr-14">
                <h2 id={dialogTitleId} className="text-sm font-semibold">
                  {roomTitle}
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3"
                aria-label="Close"
                onClick={() => setBedMapOpen(false)}
              >
                <X />
              </Button>
              <div className="min-h-0 flex-1 overflow-hidden px-5 py-4">{bedMapEditor}</div>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </article>
  );
}
