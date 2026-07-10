'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useTransition } from 'react';
import { cn } from '@/shared/lib/utils';
import { useRoutePending } from './RoutePendingContext';

type AppLinkProps = ComponentProps<typeof Link>;

/** In-app navigation with a global route-pending indicator. */
export function AppLink({ href, onClick, className, ...props }: AppLinkProps) {
  const routePending = useRoutePending();
  const [isPending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      className={cn(isPending && 'pointer-events-none opacity-80', className)}
      aria-busy={isPending || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }

        routePending?.beginRouteTransition();
        startTransition(() => {
          // Next.js handles navigation; transition keeps pending until pathname updates.
        });
      }}
      {...props}
    />
  );
}
