'use client';

import { pressableTileActiveClass, Skeleton, StepRingProgress } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

type StayEssentialsConciergeBannerLayoutDefaultProps = {
  variant?: 'default';
  title: string;
  description: string;
  testId: string;
  totalSteps: number;
  completedSteps: number;
  pending?: boolean;
  onClick: () => void;
};

type StayEssentialsConciergeBannerLayoutSkeletonProps = {
  variant: 'skeleton';
  testId: string;
};

export type StayEssentialsConciergeBannerLayoutProps =
  | StayEssentialsConciergeBannerLayoutDefaultProps
  | StayEssentialsConciergeBannerLayoutSkeletonProps;

export function StayEssentialsConciergeBannerLayout(
  props: StayEssentialsConciergeBannerLayoutProps
) {
  if (props.variant === 'skeleton') {
    return (
      <div
        aria-busy="true"
        data-testid={props.testId}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
      >
        <span className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5 max-w-[12rem]" />
          <Skeleton className="h-3 w-full max-w-[16rem]" />
        </span>
        <Skeleton className="size-10 shrink-0 rounded-full" aria-hidden />
      </div>
    );
  }

  const {
    title,
    description,
    testId,
    totalSteps,
    completedSteps,
    pending = false,
    onClick,
  } = props;

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
