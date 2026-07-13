export const RECEPTION_REFRESH_EVENT = 'reception:refresh';

export type ReceptionRefreshDetail = {
  refresh?: 'context';
};

export function subscribeReceptionRefresh(onRefresh: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ReceptionRefreshDetail>).detail;
    const kind = detail?.refresh ?? 'context';
    if (kind === 'context') {
      onRefresh();
    }
  };

  window.addEventListener(RECEPTION_REFRESH_EVENT, handler);
  return () => {
    window.removeEventListener(RECEPTION_REFRESH_EVENT, handler);
  };
}

export function dispatchReceptionRefresh(detail: ReceptionRefreshDetail = { refresh: 'context' }): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ReceptionRefreshDetail>(RECEPTION_REFRESH_EVENT, { detail })
  );
}
