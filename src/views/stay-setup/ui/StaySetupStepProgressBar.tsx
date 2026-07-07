'use client';

import { cn } from '@/shared/lib/utils';
import type { StaySetupCompletion, StaySetupStep } from '../lib/resolveStaySetupSteps';
import { resolveStaySetupStepSegmentState } from '../lib/resolveStaySetupStepSegmentState';

export type StaySetupProgressStep = {
  id: StaySetupStep;
  label: string;
  locked: boolean;
};

export interface StaySetupStepProgressBarProps {
  steps: StaySetupProgressStep[];
  value: StaySetupStep;
  completion: StaySetupCompletion;
  ariaLabel: string;
  className?: string;
}

export function StaySetupStepProgressBar({
  steps,
  value,
  completion,
  ariaLabel,
  className,
}: StaySetupStepProgressBarProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === value)
  );

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.max(steps.length - 1, 0)}
      aria-valuenow={currentIndex}
      className={cn('flex w-full items-center gap-1.5', className)}
    >
      {steps.map((step) => {
        const segmentState = resolveStaySetupStepSegmentState(
          step.id,
          value,
          completion,
          step.locked
        );
        const isActive = segmentState === 'current';
        const isCompleted = segmentState === 'completed';
        const isLocked = segmentState === 'locked';

        return (
          <div
            key={step.id}
            aria-hidden
            className={cn(
              'h-2 min-w-0 flex-1 rounded-full transition-colors',
              isActive && 'bg-primary/45 ring-2 ring-inset ring-primary',
              isCompleted && 'bg-primary/45 ring-0',
              segmentState === 'upcoming' && 'bg-muted-foreground/20',
              isLocked && 'bg-muted-foreground/15 opacity-60'
            )}
          />
        );
      })}
    </div>
  );
}
