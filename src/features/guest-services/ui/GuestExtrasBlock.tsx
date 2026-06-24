'use client';

import { useMemo, useState } from 'react';
import { formatStayReference } from '@/entities/guest-stay';
import {
  resolveGuestExtrasLayout,
  trackGuestExtraEvent,
  type ResolvedGuestExtra,
} from '@/entities/guest-extra';
import { resolveGuestStayPlan, useTenant } from '@/entities/tenant';
import { resolveGuestStayBedLabel } from '@/features/guest-stay-chip/lib/buildExtendStayWhatsappMessage';
import { useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { useTranslations } from '@/shared/i18n';
import { GuestExtraSheet } from './GuestExtraSheet';
import { GuestExtraStandardTile } from './GuestExtraStandardTile';
import { GuestExtrasFeaturedStrip } from './GuestExtrasFeaturedStrip';

export function GuestExtrasBlock() {
  const { settings } = useTenant();
  const { session } = useGuestSession();
  const isRegistered = useIsGuestRegistered();
  const t = useTranslations('components.guestExtras');
  const tBed = useTranslations('components.findYourBed');
  const [selectedExtra, setSelectedExtra] = useState<ResolvedGuestExtra | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const layout = useMemo(
    () => resolveGuestExtrasLayout(settings, isRegistered),
    [settings, isRegistered]
  );
  const plan = useMemo(
    () => resolveGuestStayPlan(settings, session?.bedId),
    [settings, session?.bedId]
  );
  const stayRef = session?.stayId ? formatStayReference(session.stayId) : null;
  const bedLabel = useMemo(
    () =>
      resolveGuestStayBedLabel(plan, (key, values) =>
        tBed(key, values as Record<string, string | number> | undefined)
      ),
    [plan, tBed]
  );

  const hasExtras = layout.featured.length > 0 || layout.standard.length > 0;

  if (!hasExtras) {
    return null;
  }

  const openExtra = (extra: ResolvedGuestExtra) => {
    trackGuestExtraEvent('extras_tile_click', {
      presetId: extra.presetId,
      tileVariant: extra.tileVariant,
    });
    setSelectedExtra(extra);
    setSheetOpen(true);
  };

  return (
    <section className="space-y-3">
      <h3 className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {t('sectionTitle')}
      </h3>

      {layout.featured.length > 0 ? (
        <div className="space-y-2">
          {layout.featured.length > 1 ? (
            <p className="px-1 text-[10px] tracking-wide text-muted-foreground uppercase">
              {t('featuredLabel')}
            </p>
          ) : null}
          <GuestExtrasFeaturedStrip extras={layout.featured} onSelect={openExtra} />
        </div>
      ) : null}

      {layout.standard.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {layout.standard.map((extra) => (
            <GuestExtraStandardTile key={extra.presetId} extra={extra} onSelect={() => openExtra(extra)} />
          ))}
        </div>
      ) : null}

      <GuestExtraSheet
        extra={selectedExtra}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bedLabel={bedLabel}
        stayRef={stayRef}
      />
    </section>
  );
}
