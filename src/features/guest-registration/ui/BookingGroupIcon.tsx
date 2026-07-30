'use client';

import { Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/** Shared mark for multi-bed bookings (Hub, Cash, stay detail, peek). */
export function BookingGroupIcon({ className }: { className?: string }) {
  return <Users className={cn('size-3.5 shrink-0 text-muted-foreground', className)} aria-hidden />;
}
