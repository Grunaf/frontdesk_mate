'use client';

import { useState } from 'react';
import { RoomLayout } from '@/entities/room';
import { resolveGuestStayPlan } from '@/entities/tenant';
import { useNightMode } from '@/shared/lib';
import { useTranslations } from '@/shared/i18n';
import { useTenant } from '@/entities/tenant';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { StayStepsCarousel } from './StayStepsCarousel';
import { FindYourBedSummary } from './FindYourBedSummary';

interface FindYourBedPanelProps {
  /** Compact mode hides floor path hints shown as standalone text blocks. */
  compact?: boolean;
}

export function FindYourBedPanel({ compact = false }: FindYourBedPanelProps) {
  const t = useTranslations('components.findYourBed');
  const { settings } = useTenant();
  const isNight = useNightMode();
  const plan = resolveGuestStayPlan(settings);

  const floorHintOnly = plan.steps.find((step) => step.kind === 'floor_path' && step.hint && !step.imageSrc);
  const photoSteps = plan.steps.filter((step) => step.imageSrc);
  const hasMap = plan.layoutBeds.length > 0;
  const hasDirections = !compact && Boolean(floorHintOnly || photoSteps.length > 0);
  const [directionsOpen, setDirectionsOpen] = useState(!hasMap && hasDirections);

  if (!plan.hasContent || !plan.bedId) {
    return (
      <section className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{t('fallback')}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          {t('title')}
        </h3>
        <FindYourBedSummary plan={plan} variant="breadcrumb" />
      </div>

      {hasMap ? (
        <div>
          <p className="mb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {t('insideRoom')}
          </p>
          <RoomLayout
            beds={plan.layoutBeds}
            roomBounds={plan.roomBounds}
            guestStay={settings.guestStay}
            highlightedBedId={plan.bedId}
            entranceSide={plan.room?.entranceSide}
            isNightMode={isNight}
          />
        </div>
      ) : null}

      {hasDirections ? (
        <div className="rounded-xl border bg-muted/20">
          <button
            type="button"
            onClick={() => setDirectionsOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
          >
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t('directionsToRoom')}
            </span>
            <Icon
              icon={ChevronDown}
              className={cn('size-4 text-muted-foreground transition-transform', directionsOpen && 'rotate-180')}
            />
          </button>

          {directionsOpen ? (
            <div className="space-y-3 border-t border-border/60 px-3 pb-3 pt-2">
              {floorHintOnly ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{floorHintOnly.hint}</p>
              ) : null}
              {photoSteps.length > 0 ? <StayStepsCarousel steps={photoSteps} /> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
