export function readStayEssentialRead(storageKey: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
}

export function persistStayEssentialRead(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, '1');
  } catch {
    // ignore storage failures
  }
}
