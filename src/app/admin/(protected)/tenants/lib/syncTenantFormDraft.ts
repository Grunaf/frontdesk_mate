import { useRef } from 'react';

/** Keep latest local form state in a ref for event handlers (avoids stale closures). */
export function useSyncedFormRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
