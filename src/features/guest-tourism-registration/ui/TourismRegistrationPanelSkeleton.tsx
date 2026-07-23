'use client';

import { Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

type TourismRegistrationPanelSkeletonProps = {
  loadingLabel: string;
  className?: string;
};

/** Matches TourismGuestsRegistrationPanel incomplete layout (pinned chrome). */
export function TourismRegistrationPanelSkeleton({
  loadingLabel,
  className,
}: TourismRegistrationPanelSkeletonProps) {
  return (
    <div aria-busy="true" className={cn('flex min-h-0 flex-1 flex-col pt-0', className)}>
      <p className="sr-only" role="status">
        {loadingLabel}
      </p>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[94%]" />
          <Skeleton className="h-4 w-[72%]" />
        </div>

        <div className="space-y-1 rounded-xl border bg-muted/20 p-4">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>

        <Skeleton className="h-11 w-full rounded-md" />
      </div>

      <div className="mt-auto shrink-0 space-y-4 pt-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  );
}

/** Copy shown after tourism form complete while waiting for desk passport admit. */
export function TourismPassportVerifyWaitingCopy({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3 text-sm leading-relaxed text-foreground">
      {message}
    </p>
  );
}
