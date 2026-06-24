'use client';

import type { LandingRoomType, TenantSettings } from '@/entities/tenant';
import { shouldShowRoomDescription } from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { LandingRoomCard } from '@/widgets/RoomsGallery/ui/LandingRoomCard';

interface LandingRoomCardPreviewProps {
  room: LandingRoomType;
  settings?: TenantSettings;
}

export function LandingRoomCardPreview({ room, settings }: LandingRoomCardPreviewProps) {
  const hasDescription = shouldShowRoomDescription(room.description);

  if (!room.title?.trim() && !room.imageUrl?.trim()) {
    return null;
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/10 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Landing card preview
      </p>
      <div className="mt-2 w-full max-w-xl">
        <LandingRoomCard variant="preview" room={room} settings={settings ?? {}} />
      </div>
      {!hasDescription && room.title?.trim() ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Empty description — guests see photo, title, price, and book button only.
        </p>
      ) : null}
    </div>
  );
}
