'use client';

import { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useRoutePending } from './RoutePendingContext';

export function useAppNavigation() {
  const router = useRouter();
  const routePending = useRoutePending();
  const [isPending, startTransition] = useTransition();

  const push = useCallback(
    (href: string) => {
      routePending?.beginRouteTransition();
      startTransition(() => {
        router.push(href);
      });
    },
    [routePending, router]
  );

  return {
    push,
    pending: isPending || Boolean(routePending?.isRoutePending),
  };
}
