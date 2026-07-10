'use client';

import Link from 'next/link';
import type { GuestStayPlan } from '@/entities/tenant';
import { FindYourBedSummary } from '@/features/find-your-bed/ui/FindYourBedSummary';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button, Icon, Skeleton } from '@/shared/ui';
import { ChevronRight } from 'lucide-react';

interface GuestStayBedLocationCardProps {
  plan: GuestStayPlan;
  navigatePath?: string;
  locked?: boolean;
  navigateLoading?: boolean;
}

export function GuestStayBedLocationCard({
  plan,
  navigatePath,
  locked = false,
  navigateLoading = false,
}: GuestStayBedLocationCardProps) {
  const tChip = useTranslations('components.guestStayChip');
  const tBed = useTranslations('components.findYourBed');

  if (!plan.bedId) {
    return null;
  }

  const showLockedCopy = locked && !navigateLoading;

  return (
    <div
      className={cn(
        'rounded-xl border bg-muted/30 p-2.5',
        (locked || navigateLoading) && 'opacity-80'
      )}
      aria-busy={navigateLoading || undefined}
    >
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
          ) : showLockedCopy ? (
            <p className="text-sm leading-snug text-muted-foreground">{tChip('bedLockedUntilTourism')}</p>
          ) : (
            <FindYourBedSummary plan={plan} variant="breadcrumb" omitFloor />
          )}
        </div>
        {navigateLoading ? (
          <Skeleton className="size-8 shrink-0 rounded-md" aria-hidden />
        ) : (
          <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
            <Link href={navigatePath ?? '#'} aria-label={tChip('showRoomMapLink')}>
              <Icon icon={ChevronRight} className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
