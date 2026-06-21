import { notFound } from 'next/navigation';
import { isProd } from '@/shared/lib/env';

/** Dev panel is disabled in production builds. */
export function assertDevPanelAvailable(): void {
  if (isProd) {
    notFound();
  }
}
