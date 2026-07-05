'use client';

import { Check, Circle } from 'lucide-react';
import {
  resolveGuestPathItemsForStep,
  type GuestPathItem,
  type GuestPathReadinessInput,
  type LaunchStepId,
} from '@/entities/tenant/lib/resolveGuestPathReadiness';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

interface LaunchStepChecklistProps {
  stepId: LaunchStepId;
  readinessInput: GuestPathReadinessInput;
}

function ChecklistRow({ item }: { item: GuestPathItem }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        icon={item.complete ? Check : Circle}
        className={cn(
          'mt-0.5 size-4 shrink-0',
          item.complete ? 'text-green-700' : 'text-amber-700'
        )}
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {item.label}
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
              item.tier === 'must'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {item.tier === 'must' ? 'Must' : 'Later'}
          </span>
        </span>
        {item.detail && !item.complete ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
        ) : null}
      </span>
    </li>
  );
}

export function LaunchStepChecklist({ stepId, readinessInput }: LaunchStepChecklistProps) {
  const items = resolveGuestPathItemsForStep(readinessInput, stepId).filter(
    (item) => item.tier === 'must' || !item.complete
  );

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
        This step is ready for guests.
      </p>
    );
  }

  return (
    <ul className="space-y-2 rounded-lg border bg-muted/20 px-3 py-3">
      {items.map((item) => (
        <ChecklistRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
