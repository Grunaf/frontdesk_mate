'use client';

import type { ResolvedGuestExtra } from '@/entities/guest-extra';
import { useTranslations } from '@/shared/i18n';
import { guestExtraPresetI18nKey } from '../lib/guestExtraI18n';

interface GuestExtraStandardTileProps {
  extra: ResolvedGuestExtra;
  onSelect: () => void;
}

export function GuestExtraStandardTile({ extra, onSelect }: GuestExtraStandardTileProps) {
  const t = useTranslations('components.guestExtras');
  const key = guestExtraPresetI18nKey(extra.presetId);

  const priceLine = extra.priceLabel
    ? t('priceLabel', { price: extra.priceLabel })
    : t('priceAskReception');

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`guest-extra-tile-${extra.presetId}`}
      className="rounded-xl border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
    >
      <p className="text-sm font-medium text-foreground">{t(`${key}.title`)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{priceLine}</p>
      {extra.scheduleLabel ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t('scheduleLabel', { schedule: extra.scheduleLabel })}
        </p>
      ) : null}
    </button>
  );
}
