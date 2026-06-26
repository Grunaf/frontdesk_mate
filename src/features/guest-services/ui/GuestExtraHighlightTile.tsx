'use client';

import type { ResolvedGuestExtra } from '@/entities/guest-extra';
import { useTranslations } from '@/shared/i18n';
import { formatGuestExtraPriceLine } from '../lib/formatGuestExtraPriceLine';
import { guestExtraPresetI18nKey } from '../lib/guestExtraI18n';

interface GuestExtraHighlightTileProps {
  extra: ResolvedGuestExtra;
  onSelect: () => void;
}

export function GuestExtraHighlightTile({ extra, onSelect }: GuestExtraHighlightTileProps) {
  const t = useTranslations('components.guestExtras');
  const key = guestExtraPresetI18nKey(extra.presetId);

  const priceLine = formatGuestExtraPriceLine(
    (key, values) => t(key, values),
    extra.priceLabel,
    'from'
  );

  const title = t(`${key}.title`);

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`guest-extra-highlight-${extra.presetId}`}
      aria-label={`${title}, ${priceLine}`}
      className="relative aspect-square w-[54.5vw] max-w-[231px] shrink-0 snap-start overflow-hidden rounded-xl border bg-muted"
    >
      {extra.imageUrl ? (
        <img
          src={extra.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-3 text-left">
        <p className="line-clamp-2 text-2xl font-semibold text-white">{title}</p>
        <span className="inline-flex min-h-8 min-w-[4.5rem] items-center justify-center rounded-full bg-background/90 px-3 text-xs font-medium text-foreground">
          {priceLine}
        </span>
      </div>
    </button>
  );
}
