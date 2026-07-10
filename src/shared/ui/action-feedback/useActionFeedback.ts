'use client';

import { useCallback, useEffect, useRef, useTransition } from 'react';

/** Runs async-friendly work in a transition; ignores repeat taps while pending. */
export function useActionFeedback() {
  const [isPending, startTransition] = useTransition();
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!isPending) {
      lockedRef.current = false;
    }
  }, [isPending]);

  const run = useCallback(
    (action: () => void) => {
      if (isPending || lockedRef.current) {
        return;
      }

      lockedRef.current = true;
      startTransition(() => {
        action();
      });
    },
    [isPending, startTransition]
  );

  return { pending: isPending, isPending, run, startTransition };
}
