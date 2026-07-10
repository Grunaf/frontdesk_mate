'use client';

import { pressableTileActiveClass, StepRingProgress } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

type StayEssentialsConciergeBannerLayoutProps = {
  title: string;
  description: string;
  testId: string;
  totalSteps: number;
  completedSteps: number;
  pending?: boolean;
  onClick: () => void;
};

export function StayEssentialsConciergeBannerLayout({
  title,
  description,
  testId,
  totalSteps,
  completedSteps,
  pending = false,
  onClick,
}: StayEssentialsConciergeBannerLayoutProps) {
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={title}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
        pressableTileActiveClass,
        pending && 'pointer-events-none opacity-80'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <StepRingProgress
        totalSteps={totalSteps}
        completedSteps={completedSteps}
        aria-label={`${completedSteps} of ${totalSteps}`}
      />
    </button>
  );
}
