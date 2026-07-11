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
      role="group"
      aria-label={ariaLabel}
      className={cn('flex w-full items-center gap-1.5', className)}
    >
      {steps.map((step, index) => {
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
            role="presentation"
            aria-label={step.label}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'h-2 min-w-0 flex-1 rounded-full transition-colors',
              isActive && 'bg-primary/45 ring-2 ring-inset ring-primary',
              isCompleted && 'bg-primary/45 ring-0',
              segmentState === 'upcoming' && 'bg-muted-foreground/20',
              isLocked && 'bg-muted-foreground/15 opacity-60'
            )}
            data-step-index={index}
            data-segment-state={segmentState}
          />
        );
      })}
      <span className="sr-only" aria-live="polite">
        {currentIndex + 1} / {steps.length}
      </span>
    </div>
  );
}
