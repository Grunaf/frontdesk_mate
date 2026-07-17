'use client';

import Link from 'next/link';
import type { GuestStayPlan } from '@/entities/tenant';
import { FindYourBedSummary } from '@/features/find-your-bed/ui/FindYourBedSummary';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Icon, Skeleton } from '@/shared/ui';
import { ChevronRight } from 'lucide-react';

export type GuestStayBedLocationLockReason = 'before_check_in' | 'registration';

interface GuestStayBedLocationCardProps {
  plan: GuestStayPlan;
  navigatePath?: string;
  lockReason?: GuestStayBedLocationLockReason | null;
  checkInTimeLabel?: string;
  navigateLoading?: boolean;
}

export function GuestStayBedLocationCard({
  plan,
  navigatePath,
  lockReason = null,
  checkInTimeLabel = '14:00',
  navigateLoading = false,
}: GuestStayBedLocationCardProps) {
  const tChip = useTranslations('components.guestStayChip');
  const tBed = useTranslations('components.findYourBed');

  if (!plan.bedId) {
    return null;
  }

  const locked = Boolean(lockReason) && !navigateLoading;
  const showNavigate = Boolean(navigatePath) && !navigateLoading;

  const shellClassName = cn(
    'rounded-xl border bg-muted/30 p-2.5',
    (locked || navigateLoading) && 'opacity-80',
    showNavigate &&
      'block transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
  );

  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {tBed('title')}
        </p>
        {navigateLoading ? (
          <div className="space-y-1.5 pt-0.5" aria-hidden>
            <Skeleton className="h-4 w-full max-w-[10rem]" />
            <Skeleton className="h-3 w-4/5 max-w-[8rem]" />
          </div>
        ) : lockReason === 'before_check_in' ? (
          <p className="text-sm leading-snug text-muted-foreground">
            {tChip('bedLockedUntilCheckIn', { time: checkInTimeLabel })}
          </p>
        ) : lockReason === 'registration' ? (
          <p className="text-sm leading-snug text-muted-foreground">{tChip('bedLockedUntilRegistration')}</p>
        ) : (
          <FindYourBedSummary plan={plan} variant="breadcrumb" omitFloor />
        )}
      </div>
      {navigateLoading ? (
        <Skeleton className="size-8 shrink-0 rounded-md" aria-hidden />
      ) : showNavigate ? (
        <span className="flex size-8 shrink-0 items-center justify-center" aria-hidden>
          <Icon icon={ChevronRight} className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );

  if (showNavigate) {
    return (
      <Link href={navigatePath!} className={shellClassName} aria-label={tChip('showRoomMapLink')}>
        {body}
      </Link>
    );
  }

  return (
    <div className={shellClassName} aria-busy={navigateLoading || undefined}>
      {body}
    </div>
  );
}
