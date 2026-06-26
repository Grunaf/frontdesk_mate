import { SITE_CONFIG } from '@/shared/config';

export type AppHeaderMode = 'concierge' | 'arrivalGuide' | 'nested' | 'preSession';

export function resolveAppHeaderMode(cleanPath: string): AppHeaderMode {
  if (cleanPath === SITE_CONFIG.routes.app.concierge.path) {
    return 'concierge';
  }

  if (cleanPath === SITE_CONFIG.routes.app.welcome.path) {
    return 'arrivalGuide';
  }

  if (cleanPath.startsWith('/check-in')) {
    return 'preSession';
  }

  return 'nested';
}

export function shouldAutoHideAppHeader(mode: AppHeaderMode): boolean {
  return mode !== 'preSession';
}
