'use client';

import { Skeleton } from '@/shared/ui';

type TourismRegistrationPanelSkeletonProps = {
  loadingLabel: string;
};

export function TourismRegistrationPanelSkeleton({ loadingLabel }: TourismRegistrationPanelSkeletonProps) {
  return (
    <div aria-busy="true" className="space-y-6 pt-5">
      <p className="sr-only" role="status">
        {loadingLabel}
      </p>

      <div className="space-y-2">
        <Skeleton className="h-6 w-[min(100%,16rem)]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="mt-1 h-4 w-44" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-[3.25rem] w-full rounded-xl" />
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 p-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-[min(100%,18rem)]" />
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
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
