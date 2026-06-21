'use client';

import { useNightMode } from '@/shared/lib';
import { useTranslations } from '@/shared/i18n';
import { useArrivalAccessPlan } from '../lib/useArrivalAccessPlan';
import { CheckInNowSection } from './CheckInNowSection';
import { FindHostelSection } from './FindHostelSection';
import { NightReturnSection } from './NightReturnSection';

export function DoorAccessPanel() {
  const isNightMode = useNightMode();
  const plan = useArrivalAccessPlan();
  const doors = useTranslations('domains.hostel.enter.doors');

  const hasContent =
    plan.landmark || plan.dayAccess || (plan.nightAccess?.hasAnyCode || plan.nightAccess?.steps.some((s) => s.imageSrc));

  if (!hasContent) {
    return (
      <div className="space-y-6 pt-5">
        <p className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
          {doors('emptyState')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-5">
      <FindHostelSection />
      {isNightMode ? <NightReturnSection /> : <CheckInNowSection />}
    </div>
  );
}
