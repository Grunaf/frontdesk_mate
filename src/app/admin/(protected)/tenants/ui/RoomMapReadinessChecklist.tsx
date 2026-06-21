'use client';

import { useMemo } from 'react';
import type { TenantSettings } from '@/entities/tenant';
import { resolveCapabilities } from '@/entities/tenant/lib/resolveCapabilities';
import {
  resolveRoomMapReadiness,
  type RoomMapReadinessStep,
} from '@/entities/tenant/lib/resolveRoomMapReadiness';
import type { TenantLifecycleStatus } from '@/entities/tenant/lib/resolveTenantLifecycle';
import type { CityPackId } from '@/entities/hostel';
import { cn } from '@/shared/lib/utils';
import { AdminSectionStatusBadge } from './AdminField';

interface RoomMapReadinessChecklistProps {
  cityPackId: CityPackId;
  settings: TenantSettings;
  lifecycleStatus: TenantLifecycleStatus;
  title?: string;
  description?: string;
}

export function RoomMapReadinessChecklist({
  cityPackId,
  settings,
  lifecycleStatus,
  title = 'Setup progress',
  description = 'Guests see Find your bed in Settlement when all required steps pass.',
}: RoomMapReadinessChecklistProps) {
  const steps = useMemo(
    () => resolveRoomMapReadiness({ settings, lifecycleStatus }),
    [settings, lifecycleStatus]
  );
  const roomMapLive = useMemo(
    () => resolveCapabilities({ cityPackId, settings }).roomMap === 'ready',
    [cityPackId, settings]
  );

  return (
    <section className="space-y-3 rounded-xl border border-dashed bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <AdminSectionStatusBadge status={roomMapLive ? 'ready' : 'hidden'} />
      </div>

      <WizardSteps steps={steps} />

      {roomMapLive ? (
        <p className="rounded-lg border border-green-200/80 bg-green-50/60 px-3 py-2 text-sm text-green-900">
          Room map is live — guests will see it in the Settlement tab.
        </p>
      ) : (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
          Complete all required steps above before guests can see this block.
        </p>
      )}
    </section>
  );
}

function WizardSteps({ steps }: { steps: RoomMapReadinessStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((step) => (
        <li
          key={step.id}
          className={cn(
            'flex items-start gap-2 rounded-md px-2 py-1.5 text-xs',
            step.complete
              ? 'text-muted-foreground'
              : step.tier === 'info'
                ? 'text-muted-foreground'
                : 'bg-amber-50/80 text-amber-950'
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
              step.complete ? 'bg-green-100 text-green-800' : 'bg-amber-200 text-amber-950'
            )}
          >
            {step.complete ? '✓' : '·'}
          </span>
          <span>
            <span className="font-medium">{step.label}</span>
            {!step.complete && step.message ? (
              <span className="mt-0.5 block text-[11px] opacity-90">{step.message}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
