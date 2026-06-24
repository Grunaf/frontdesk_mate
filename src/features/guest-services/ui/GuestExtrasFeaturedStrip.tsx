'use client';

import type { ResolvedGuestExtra } from '@/entities/guest-extra';
import { GuestExtraHighlightTile } from './GuestExtraHighlightTile';

interface GuestExtrasFeaturedStripProps {
  extras: ResolvedGuestExtra[];
  onSelect: (extra: ResolvedGuestExtra) => void;
}

export function GuestExtrasFeaturedStrip({ extras, onSelect }: GuestExtrasFeaturedStripProps) {
  if (extras.length === 0) {
    return null;
  }

  return (
    <div
      className="-mx-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid="guest-extras-featured-strip"
    >
      <div className="flex w-max gap-2 pr-4 snap-x snap-mandatory">
        {extras.map((extra) => (
          <GuestExtraHighlightTile
            key={extra.presetId}
            extra={extra}
            onSelect={() => onSelect(extra)}
          />
        ))}
      </div>
    </div>
  );
}
