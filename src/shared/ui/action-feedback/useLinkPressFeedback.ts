'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_EXTERNAL_PENDING_MS = 2000;

/** Brief pending state after tap on links that leave the page (external, tel:, mailto:). */
export function useLinkPressFeedback(clearAfterMs = DEFAULT_EXTERNAL_PENDING_MS) {
  const [pending, setPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const markPressed = useCallback(() => {
    setPending(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setPending(false);
      timeoutRef.current = null;
    }, clearAfterMs);
  }, [clearAfterMs]);

  const bindLinkPress = useCallback(
    (userOnClick?: React.MouseEventHandler<HTMLElement>) => {
      return {
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          markPressed();
          userOnClick?.(event);
        },
        'aria-busy': pending ? true : undefined,
      } as const;
    },
    [markPressed, pending]
  );

  return { pending, markPressed, bindLinkPress };
}
